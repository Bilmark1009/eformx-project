<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Form extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'fields',
        'status',
        'branding',
    ];

    protected $casts = [
        'fields' => 'array',
        'branding' => 'array',
    ];

    protected $with = ['attempts'];

    // Relationship to User (works for both User and SuperAdmin via user_id)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Relationship to FormResponses
    public function responses()
    {
        return $this->hasMany(FormResponse::class);
    }

    public function attempts()
    {
        return $this->hasMany(FormAttempt::class);
    }

    public function getAnalytics()
    {
        $attemptsByStatus = $this->attempts
            ->groupBy('status')
            ->map->count();

        $completedAttempts = $attemptsByStatus['completed'] ?? 0;
        $abandonedAttempts = $attemptsByStatus['abandoned'] ?? 0;
        $startedAttempts = $attemptsByStatus['started'] ?? 0;

        // Fallback: if no completed attempts were recorded, use submitted responses as the completed count
        if ($completedAttempts === 0) {
            $completedAttempts = $this->responses()->count();
        }
        $trackedAttempts = $completedAttempts + $abandonedAttempts;

        $recentActivity = $this->attempts
            ->where('created_at', '>=', now()->subDays(7))
            ->count();

        return [
            'totalRespondents' => $completedAttempts,
            'completionRate' => $trackedAttempts > 0 ? round(($completedAttempts / $trackedAttempts) * 100, 1) : 0,
            'recentActivity' => $recentActivity,
            'totalAttempts' => $completedAttempts + $abandonedAttempts + $startedAttempts,
            'abandonedAttempts' => $abandonedAttempts,
            'activeStartedAttempts' => $startedAttempts,
            'trackedAttempts' => $trackedAttempts,
            'statusBreakdown' => [
                'started' => [
                    'count' => $startedAttempts,
                ],
                'completed' => [
                    'count' => $completedAttempts,
                ],
                'abandoned' => [
                    'count' => $abandonedAttempts,
                ],
            ],
        ];
    }
}
