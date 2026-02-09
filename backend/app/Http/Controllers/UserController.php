<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\SuperAdmin;
use App\Mail\AccountCreatedMail;
use App\Mail\AccountDeletedMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use App\Models\Notification;

class UserController extends Controller
{
    /**
     * Display a listing of all users.
     */
    public function index(Request $request)
    {
        if (!($request->user() instanceof SuperAdmin)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $users = User::latest()->get();
        return response()->json($users);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        if (!($request->user() instanceof SuperAdmin)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'nullable|string|max:50',
            'status' => 'nullable|in:Active,Inactive',
        ]);

        // Capture raw password for email before hashing
        $rawPassword = $validated['password'];
        $validated['password'] = Hash::make($rawPassword);

        if (!isset($validated['status'])) {
            $validated['status'] = 'Active';
        }

        // Check if email exists in SuperAdmin table to prevent duplicates
        if (SuperAdmin::where('email', $validated['email'])->exists()) {
            Notification::create([
                'title' => 'Account Creation Failed',
                'message' => 'Email already registered as a Super Admin: ' . $validated['email'],
                'type' => 'error',
                'recipient_admin_id' => $request->user()->id,
            ]);
            return response()->json(['message' => 'Email already registered as a Super Admin'], 422);
        }

        $user = User::create($validated);

        // System Notification for SuperAdmin
        $createdRole = $user->role ?: 'User';
        $createdRoleLabel = ucwords(strtolower($createdRole));

        Notification::create([
            'title' => $createdRoleLabel . ' Account Created',
            'message' => $createdRoleLabel . ' account created: ' . $user->email,
            'type' => 'success',
            'recipient_admin_id' => $request->user()->id,
        ]);

        // ✅ Send credentials email to ALL new users (Universal)
        try {
            Mail::to($user->email)->send(new AccountCreatedMail($user->name, $user->email, $rawPassword));
        } catch (\Throwable $e) {
            Log::error('AccountCreatedMail delivery failed', [
                'user_id' => $user->id,
                'email' => $user->email,
                'exception' => $e->getMessage(),
            ]);
            
            Notification::create([
                'title' => 'Mail Delivery Warning',
                'message' => 'Failed to send credentials email to: ' . $user->email,
                'type' => 'warning',
                'recipient_admin_id' => $request->user()->id,
            ]);
        }

        return response()->json($user, 201);
    }

    /**
     * Update the specified user (Handles Cross-Table Conversions).
     */
    public function update(Request $request, $id)
    {
        if (!($request->user() instanceof SuperAdmin)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user = User::find($id);
        
        // Validation with unique check (ignoring current ID)
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($user?->id ?? $id)],
            'password' => 'sometimes|nullable|string|min:6',
            'role' => 'nullable|string|max:50',
            'status' => 'nullable|in:Active,Inactive',
        ]);

        // Prevent updating to an email that belongs to an existing Super Admin
        if (array_key_exists('email', $validated) && SuperAdmin::where('email', $validated['email'])->exists()) {
             return response()->json(['message' => 'Email already registered as a Super Admin'], 422);
        }

        // Process Password
        if (isset($validated['password']) && !empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        // SCENARIO 1: Modifying an existing record in the USERS table
        if ($user) {
            $previousStatus = $user->status ?? 'Active';

            // Check if converting User -> SuperAdmin
            if (isset($validated['role']) && strcasecmp($validated['role'], 'Super Admin') === 0) {
                $admin = SuperAdmin::create([
                    'name' => $validated['name'] ?? $user->name,
                    'email' => $validated['email'] ?? $user->email,
                    'password' => $validated['password'] ?? $user->password,
                ]);
                $user->delete();
                return response()->json(['id' => $admin->id, 'name' => $admin->name, 'role' => 'Super Admin', 'status' => 'Active']);
            }

            $user->update($validated);

            // Notify if account status was toggled
            if (array_key_exists('status', $validated) && strcasecmp($validated['status'], $previousStatus) !== 0) {
                Notification::create([
                    'title' => 'Account Status Updated',
                    'message' => 'User ' . $user->email . ' is now ' . $validated['status'],
                    'type' => 'info',
                    'recipient_admin_id' => $request->user()->id,
                ]);
            }

            return response()->json($user);
        }

        // SCENARIO 2: Modifying a SuperAdmin (converting them back to a User)
        $admin = SuperAdmin::find($id);
        if ($admin) {
            $newUser = User::create([
                'name' => $validated['name'] ?? $admin->name,
                'email' => $validated['email'] ?? $admin->email,
                'password' => $validated['password'] ?? $admin->password,
                'role' => $validated['role'] ?? 'Admin',
                'status' => $validated['status'] ?? 'Active',
            ]);
            $admin->delete();
            return response()->json($newUser);
        }

        return response()->json(['message' => 'User not found'], 404);
    }

    /**
     * Remove the specified user.
     */
    public function destroy(Request $request, $id)
    {
        if (!($request->user() instanceof SuperAdmin)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user = User::findOrFail($id);
        $email = $user->email;
        $name = $user->name;

        $user->delete();

        try {
            Mail::to($email)->send(new AccountDeletedMail($name, $email));
        } catch (\Throwable $e) {
            Log::error('AccountDeletedMail failed: ' . $e->getMessage());
        }

        Notification::create([
            'title' => 'Account Deleted',
            'message' => 'Account deleted: ' . $email,
            'type' => 'success',
            'recipient_admin_id' => $request->user()->id,
        ]);

        return response()->json(['message' => 'User deleted successfully'], 200);
    }
}