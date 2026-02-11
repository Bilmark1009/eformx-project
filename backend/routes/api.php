<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FormController;
use App\Http\Controllers\FormAttemptController;
use App\Http\Controllers\FormResponseController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\NotificationController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/password/forgot', [AuthController::class, 'forgotPassword']);
Route::post('/password/reset', [AuthController::class, 'resetPassword']);
Route::get('/forms/{id}/public', [FormController::class, 'showPublic']);
Route::post('/forms/{formId}/responses', [FormResponseController::class, 'store']);
Route::post('/forms/{form}/attempts', [FormAttemptController::class, 'store']);
Route::post('/forms/attempts/{attempt}/status', [FormAttemptController::class, 'updateStatus']);

// Diagnostic route - Test Email
Route::get('/test-mail', function () {
    try {
        $to = request('to', env('MAIL_FROM_ADDRESS', 'eformxdetails@gmail.com'));
        $fromEmail = config('mail.from.address');
        $fromName = config('mail.from.name');

        \Illuminate\Support\Facades\Mail::raw('Test connection from EFormX. If you see this, your configuration is working!', function ($message) use ($to, $fromEmail, $fromName) {
            $message->to($to)
                ->from($fromEmail, $fromName)
                ->subject('SMTP Diagnostic Test');
        });
        return response()->json([
            'message' => 'Email sent successfully!',
            'recipient' => $to,
            'sender' => $fromEmail,
            'configuration' => config('mail.default')
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'message' => 'Email failed to send.',
            'error' => $e->getMessage(),
            'mailer' => config('mail.default'),
            'sender' => config('mail.from.address'),
            'trace' => substr($e->getTraceAsString(), 0, 500)
        ], 500);
    }
});

// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    // Update own profile (SuperAdmin or User)
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    // Change own password (requires current password)
    Route::put('/profile/password', [AuthController::class, 'changePassword']);

    // Form CRUD
    Route::apiResource('forms', FormController::class);

    // Form analytics and responses
    Route::get('/forms/{id}/analytics', [FormController::class, 'analytics']);
    Route::get('/forms/{id}/analytics/export-csv', [FormController::class, 'exportAnalyticsCsv']);
    Route::get('/forms/{id}/analytics/export-xlsx', [FormController::class, 'exportAnalyticsXlsx']);
    Route::get('/forms/{formId}/responses', [FormResponseController::class, 'index']);

    // User management (for SuperAdmin)
    Route::apiResource('users', UserController::class);
    // SuperAdmin management (list/create/update/delete)
    Route::apiResource('super-admins', SuperAdminController::class)->only(['index', 'store', 'update', 'destroy']);

    // Notifications for SuperAdmin
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::delete('/notifications', [NotificationController::class, 'destroyAll']);

    // System Stats for SuperAdmin
    Route::get('/super-admin/stats', [SuperAdminController::class, 'stats']);
});
