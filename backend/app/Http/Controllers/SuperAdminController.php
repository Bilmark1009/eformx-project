<?php

namespace App\Http\Controllers;

use App\Models\SuperAdmin;
use App\Models\User;
use App\Mail\AccountCreatedMail;
use App\Mail\AccountDeletedMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Models\Notification;
use App\Models\Form;
use App\Models\FormResponse;

class SuperAdminController extends Controller
{
    /**
     * Display system-wide stats for super admins.
     */
    public function stats(Request $request)
    {
        // Only SuperAdmin can view system stats
        if (!($request->user() instanceof SuperAdmin)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $totalRegularUsers = User::count();
        $totalSuperAdmins = SuperAdmin::count();
        $totalForms = Form::count();
        $totalResponses = FormResponse::count();

        // Role distribution
        $roleDistribution = User::select('role', \DB::raw('count(*) as count'))
            ->groupBy('role')
            ->get();

        // Add SuperAdmins to role distribution for a complete picture
        $roleDistribution->push((object) [
            'role' => 'Super Admin',
            'count' => $totalSuperAdmins
        ]);

        return response()->json([
            'metrics' => [
                'total_users' => $totalRegularUsers + $totalSuperAdmins,
                'total_forms' => $totalForms,
                'total_responses' => $totalResponses,
                'active_admins' => User::where('role', 'Admin')->where('status', 'Active')->count(),
            ],
            'distribution' => $roleDistribution
        ]);
    }

    /**
     * Display a listing of super admins.
     */
    public function index(Request $request)
    {
        // Only SuperAdmin can list super admins
        if (!($request->user() instanceof SuperAdmin)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $admins = SuperAdmin::latest()->get()->map(function ($a) {
            return [
                'id' => $a->id,
                'name' => $a->name,
                'email' => $a->email,
                'role' => 'Super Admin',
                'status' => $a->status ?? 'Active',
            ];
        });

        return response()->json($admins);
    }

    /**
     * Store a newly created SuperAdmin.
     */
    public function store(Request $request)
    {
        // Only SuperAdmin can create other SuperAdmins
        if (!($request->user() instanceof SuperAdmin)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:super_admins,email',
            'password' => 'required|string|min:6',
            'status' => 'nullable|in:Active,Inactive',
        ]);

        // Prevent creating a SuperAdmin when a regular user with same email exists
        if (User::where('email', $validated['email'])->exists()) {
            return response()->json(['message' => 'Email already registered as a regular user'], 422);
        }

        $rawPassword = $validated['password'];
        $validated['password'] = Hash::make($rawPassword);

        if (!isset($validated['status'])) {
            $validated['status'] = 'Active';
        }

        $admin = SuperAdmin::create($validated);

        // Optionally send credentials email (best-effort)
        try {
            Mail::to($admin->email)->send(new AccountCreatedMail($admin->name, $admin->email, $rawPassword));
        } catch (\Throwable $e) {
            Log::error('SuperAdmin AccountCreatedMail delivery failed', [
                'email' => $admin->email,
                'exception' => $e,
            ]);
            Notification::create([
                'title' => 'Mail Delivery Warning',
                'message' => 'Failed to send credentials email to Super Admin: ' . $admin->email,
                'type' => 'warning',
                'recipient_admin_id' => $request->user()->id,
            ]);
        }

        // Return a payload consistent with frontend expectations
        Notification::create([
            'title' => 'Super Admin Account Created',
            'message' => 'Super Admin account created: ' . $admin->email,
            'type' => 'success',
            'recipient_admin_id' => $request->user()->id,
        ]);

        return response()->json([
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => 'Super Admin',
            'status' => $admin->status,
        ], 201);
    }

    /**
     * Update a SuperAdmin. Supports conversion to regular User when role changes.
     */
    public function update(Request $request, $id)
    {
        // Only SuperAdmin can update super admins
        if (!($request->user() instanceof SuperAdmin)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $admin = SuperAdmin::findOrFail($id);

        $previousStatus = $admin->status ?? 'Active';

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', 'unique:super_admins,email,' . $admin->id],
            'password' => 'sometimes|nullable|string|min:6',
            'role' => 'nullable|string|max:50',
            'status' => 'nullable|in:Active,Inactive',
        ]);

        // If role is changing to Admin/User, convert account to users table
        if (isset($validated['role']) && strcasecmp($validated['role'], 'Super Admin') !== 0) {
            // Ensure we don't duplicate users by email
            $existingUser = User::where('email', $admin->email)->first();

            $payload = [
                'name' => $validated['name'] ?? $admin->name,
                'email' => $validated['email'] ?? $admin->email,
                // If password provided, hash; otherwise carry over hashed password
                'password' => (isset($validated['password']) && !empty($validated['password']))
                    ? \Illuminate\Support\Facades\Hash::make($validated['password'])
                    : $admin->password,
                'role' => $validated['role'] ?? 'Admin',
                'status' => $validated['status'] ?? ($existingUser?->status ?? $admin->status ?? 'Active'),
            ];

            if ($existingUser) {
                $existingUser->update($payload);
                $admin->delete();
                return response()->json($existingUser);
            }

            $newUser = User::create($payload);
            $admin->delete();

            return response()->json($newUser);
        }

        // Regular update (stays Super Admin)
        if (isset($validated['name']))
            $admin->name = $validated['name'];
        if (isset($validated['email']))
            $admin->email = $validated['email'];
        if (isset($validated['password']) && !empty($validated['password'])) {
            $admin->password = \Illuminate\Support\Facades\Hash::make($validated['password']);
        }

        if (isset($validated['status'])) {
            $admin->status = $validated['status'];
            if (strcasecmp($validated['status'], 'Inactive') === 0) {
                $admin->tokens()->delete();
            }
        }

        $admin->save();

        if (array_key_exists('status', $validated) && strcasecmp($validated['status'], $previousStatus) !== 0) {
            $action = strcasecmp($validated['status'], 'Inactive') === 0 ? 'deactivated' : 'reactivated';
            Notification::create([
                'title' => 'Super Admin Account ' . ucfirst($action),
                'message' => 'Super Admin account ' . $action . ': ' . ($admin->email ?? ''),
                'type' => 'info',
                'recipient_admin_id' => $request->user()->id,
            ]);
        }

        return response()->json([
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => 'Super Admin',
            'status' => $admin->status ?? 'Active',
        ]);
    }

    /**
     * Remove a SuperAdmin.
     */
    public function destroy(Request $request, $id)
    {
        // Only SuperAdmin can delete super admins
        if (!($request->user() instanceof SuperAdmin)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $admin = SuperAdmin::findOrFail($id);

        $name = $admin->name;
        $email = $admin->email;

        $admin->delete();

        // Attempt to notify the deleted admin via email
        try {
            Mail::to($email)->send(new AccountDeletedMail($name, $email));
        } catch (\Throwable $e) {
            Log::error('SuperAdmin AccountDeletedMail delivery failed', [
                'email' => $email,
                'exception' => $e,
            ]);
            Notification::create([
                'title' => 'Mail Delivery Warning',
                'message' => 'Failed to send account deletion email to Super Admin: ' . $email,
                'type' => 'warning',
                'recipient_admin_id' => $request->user()->id,
            ]);
        }

        // Emit success notification for the acting Super Admin
        Notification::create([
            'title' => 'Super Admin Account Deleted',
            'message' => 'Super Admin account deleted: ' . $email,
            'type' => 'success',
            'recipient_admin_id' => $request->user()->id,
        ]);

        return response()->json(['message' => 'Super Admin deleted successfully'], 200);
    }
}
