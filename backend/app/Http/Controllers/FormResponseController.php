<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\FormAttempt;
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
            'attempt_id' => 'nullable|integer|exists:form_attempts,id',
        ]);

        $attemptId = $validated['attempt_id'] ?? null;
        unset($validated['attempt_id']);

        $response = $form->responses()->create($validated);

        if ($attemptId) {
            $attempt = FormAttempt::where('id', $attemptId)
                ->where('form_id', $form->id)
                ->first();

            if ($attempt && $attempt->status !== 'completed') {
                $attempt->update(['status' => 'completed']);
            }
        } else {
            $form->attempts()->create([
                'user_id' => optional($request->user())->id,
                'status' => 'completed',
            ]);
        }

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

        // ...existing code...

        return response()->json([
            'message' => 'Response submitted successfully',
            'response' => $response
        ], 201);
    }

    /**
     * Get all responses for a specific form (protected endpoint).
     */
    public function index(Request $request, $formId)
    {
        /** @var User $user */
        $user = Auth::user();
        $form = $user->forms()->findOrFail($formId);

        $query = $form->responses()->with('attempt');

        // Date range filtering
        if ($request->has('start_date') && $request->start_date) {
            $query->where('created_at', '>=', $request->start_date . ' 00:00:00');
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->where('created_at', '<=', $request->end_date . ' 23:59:59');
        }

        // Field value filtering
        if ($request->has('filters') && is_array($request->filters)) {
            foreach ($request->filters as $filter) {
                if (isset($filter['field_id']) && isset($filter['value'])) {
                    $fieldId = $filter['field_id'];
                    $value = $filter['value'];
                    $operator = $filter['operator'] ?? 'contains';

                    $query->where(function ($q) use ($fieldId, $value, $operator) {
                        // Search in responses JSON
                        if ($operator === 'equals') {
                            $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(responses, '$.\"{$fieldId}\"')) = ?", [$value]);
                        } elseif ($operator === 'contains') {
                            $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(responses, '$.\"{$fieldId}\"')) LIKE ?", ['%' . $value . '%']);
                        } elseif ($operator === 'starts_with') {
                            $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(responses, '$.\"{$fieldId}\"')) LIKE ?", [$value . '%']);
                        }
                    });
                }
            }
        }

        // Search in respondent name/email
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('respondent_name', 'LIKE', '%' . $search . '%')
                  ->orWhere('respondent_email', 'LIKE', '%' . $search . '%');
            });
        }

        // Pagination
        $perPage = $request->get('per_page', 50);
        $page = $request->get('page', 1);

        $responses = $query->latest()->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $responses->items(),
            'pagination' => [
                'current_page' => $responses->currentPage(),
                'last_page' => $responses->lastPage(),
                'per_page' => $responses->perPage(),
                'total' => $responses->total(),
            ]
        ]);
    }

    // ...existing code...
}
