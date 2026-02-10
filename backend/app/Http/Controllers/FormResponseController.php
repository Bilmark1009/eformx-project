<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\FormEngagement;
use App\Models\FormResponse;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FormResponseController extends Controller
{
    /**
     * Store a new form response (public endpoint).
     */
    public function store(Request $request, $formId)
    {
        $form = Form::findOrFail($formId);

        // Check if form is active
        if ($form->status !== 'active') {
            return response()->json(['message' => 'This form is not accepting responses'], 403);
        }

        $validated = $request->validate([
            'respondent_name' => 'nullable|string|max:255',
            'respondent_email' => 'nullable|email|max:255',
            'responses' => 'required|array',
            'student_id' => 'nullable|string|max:255',
        ]);

        $response = $form->responses()->create($validated);

        // --- Notification Logic ---

        // 1. Notify Form Owner
        try {
            // Ensure owner has an email and load the user if not loaded
            if ($form->user && $form->user->email) {
                \Illuminate\Support\Facades\Mail::to($form->user->email)
                    ->send(new \App\Mail\NewFormResponseMail($form, $response));
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send NewFormResponseMail', [
                'form_id' => $form->id,
                'error' => $e->getMessage()
            ]);
        }

        // 2. Send Receipt to Respondent (if email provided)
        try {
            $respondentEmail = null;

            // Priority 1: Check standard 'respondent_email' field
            if (!empty($validated['respondent_email'])) {
                $respondentEmail = $validated['respondent_email'];
            }
            // Priority 2: Scan form fields for an email input
            else {
                // We need to look at the submitted answers and cross-reference with form fields
                // to find one that is likely an email.
                $formFields = $form->fields ?? [];
                $answers = $validated['responses']; // array like [['id' => '...', 'value' => '...'], ...]

                foreach ($formFields as $field) {
                    // Check if field type is email or label contains "email"
                    $isEmailType = isset($field['type']) && $field['type'] === 'email';
                    $isEmailLabel = isset($field['label']) && stripos($field['label'], 'email') !== false;

                    if ($isEmailType || $isEmailLabel) {
                        // Find the answer for this field
                        $fieldId = $field['id'];
                        $answer = collect($answers)->firstWhere('id', $fieldId);

                        if ($answer && !empty($answer['value']) && filter_var($answer['value'], FILTER_VALIDATE_EMAIL)) {
                            $respondentEmail = $answer['value'];
                            break; // Stop after finding first valid email
                        }
                    }
                }
            }

            if ($respondentEmail) {
                \Illuminate\Support\Facades\Mail::to($respondentEmail)
                    ->send(new \App\Mail\FormSubmissionReceiptMail($form, $validated['responses']));
            }

        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send FormSubmissionReceiptMail', [
                'form_id' => $form->id,
                'error' => $e->getMessage()
            ]);
        }

        // 3. Milestone notification every 5 responses
        try {
            $count = $form->responses()->count();
            if ($count > 0 && $count % 5 === 0 && $form->user) {
                Notification::create([
                    'title' => 'Response milestone reached',
                    'message' => 'Form "'.$form->title.'" reached '.$count.' responses.',
                    'type' => 'info',
                    'recipient_user_id' => $form->user->id,
                ]);
            }
        } catch (\Throwable $e) {
            // swallow notification errors
        }

        // Track submission for response-rate metrics
        $this->recordSubmission($form, $validated['student_id'] ?? null);

        return response()->json([
            'message' => 'Response submitted successfully',
            'response' => $response
        ], 201);
    }

    /**
     * Get all responses for a specific form (protected endpoint).
     */
    public function index($formId)
    {
        /** @var User $user */
        $user = Auth::user();
        $form = $user->forms()->findOrFail($formId);
        $responses = $form->responses()->latest()->get();

        return response()->json($responses);
    }

    private function recordSubmission(Form $form, ?string $studentId): void
    {
        $now = now();

        if ($studentId === null) {
            $engagement = FormEngagement::where('form_id', $form->id)
                ->whereNull('student_id')
                ->whereNull('submitted_at')
                ->latest('id')
                ->first();

            if (!$engagement) {
                $engagement = new FormEngagement([
                    'form_id' => $form->id,
                    'student_id' => null,
                    'viewed_at' => $now,
                ]);
            }
        } else {
            $engagement = FormEngagement::firstOrNew([
                'form_id' => $form->id,
                'student_id' => $studentId,
            ]);
        }

        $engagement->viewed_at = $engagement->viewed_at ?: $now;
        $engagement->status = 'submitted';
        $engagement->submitted_at = $now;
        $engagement->save();
    }
}
