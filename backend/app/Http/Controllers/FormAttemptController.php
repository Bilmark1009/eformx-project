<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\FormAttempt;
use Illuminate\Http\Request;

class FormAttemptController extends Controller
{
    public function store(Form $form, Request $request)
    {
        if ($form->status !== 'active') {
            return response()->json(['message' => 'This form is not accepting responses'], 403);
        }

        $attempt = $form->attempts()->create([
            'user_id' => optional($request->user())->id,
            'status' => 'started',
        ]);

        return response()->json([
            'attempt_id' => $attempt->id,
            'status' => $attempt->status,
        ], 201);
    }

    public function updateStatus(FormAttempt $attempt, Request $request)
    {
        $validated = $request->validate([
            'status' => 'required|in:completed,abandoned',
        ]);

        if ($attempt->status === 'completed') {
            return response()->json([
                'attempt_id' => $attempt->id,
                'status' => $attempt->status,
            ]);
        }

        $attempt->update([
            'status' => $validated['status'],
        ]);

        return response()->json([
            'attempt_id' => $attempt->id,
            'status' => $attempt->status,
        ]);
    }
}
