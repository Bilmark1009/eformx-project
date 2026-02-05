<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Notification;
use App\Models\SuperAdmin;
use App\Models\User;

class NotificationController extends Controller
{
    /**
     * List notifications for the authenticated Super Admin.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!($user instanceof SuperAdmin) && !($user instanceof User)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $items = $this->scopeForRecipient(Notification::query(), $user)
            ->latest()
            ->get();

        return response()->json($items);
    }

    /**
     * Mark a single notification as read.
     */
    public function markRead(Request $request, $id)
    {
        $user = $request->user();
        if (!($user instanceof SuperAdmin) && !($user instanceof User)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $notif = $this->scopeForRecipient(Notification::where('id', $id), $user)->firstOrFail();

        $notif->is_read = true;
        $notif->save();

        return response()->json(['message' => 'Marked read']);
    }

    /**
     * Mark all notifications as read for this admin.
     */
    public function markAllRead(Request $request)
    {
        $user = $request->user();
        if (!($user instanceof SuperAdmin) && !($user instanceof User)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->scopeForRecipient(Notification::query(), $user)->update(['is_read' => true]);

        return response()->json(['message' => 'All marked read']);
    }

    /**
     * Delete a single notification (and emit an audit notification).
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!($user instanceof SuperAdmin) && !($user instanceof User)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $notif = $this->scopeForRecipient(Notification::where('id', $id), $user)->firstOrFail();

        $title = $notif->title;
        $notif->delete();

        return response()->json(['message' => 'Deleted']);
    }

    /**
     * Delete all notifications for this admin (and emit an audit notification).
     */
    public function destroyAll(Request $request)
    {
        $user = $request->user();
        if (!($user instanceof SuperAdmin) && !($user instanceof User)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->scopeForRecipient(Notification::query(), $user)->delete();

        return response()->json(['message' => 'All deleted']);
    }

    /**
     * Restrict notifications to the authenticated recipient.
     */
    private function scopeForRecipient($query, $user)
    {
        if ($user instanceof SuperAdmin) {
            return $query->where('recipient_admin_id', $user->id);
        }

        if ($user instanceof User) {
            return $query->where('recipient_user_id', $user->id);
        }

        return $query->whereRaw('1=0');
    }
}
