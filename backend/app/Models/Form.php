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
    ];

    protected $casts = [
        'fields' => 'array',
    ];

    protected $appends = ['analytics'];

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

    // Computed analytics attribute
    public function getAnalyticsAttribute()
    {
        $attemptCounts = $this->attempts()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $completedAttempts = $attemptCounts['completed'] ?? 0;
        $abandonedAttempts = $attemptCounts['abandoned'] ?? 0;
        $startedAttempts = $attemptCounts['started'] ?? 0;
        $trackedAttempts = $completedAttempts + $abandonedAttempts;

        $recentActivity = $this->attempts()
            ->where('created_at', '>=', now()->subDays(7))
            ->count();

        return [
            'totalRespondents' => $completedAttempts,
            'completionRate' => $trackedAttempts > 0 ? round(($completedAttempts / $trackedAttempts) * 100, 1) : 0,
            'recentActivity' => $recentActivity,
            'totalAttempts' => $completedAttempts + $abandonedAttempts + $startedAttempts,
            'abandonedAttempts' => $abandonedAttempts,
            'activeStartedAttempts' => $startedAttempts,
        ];
    }
}
