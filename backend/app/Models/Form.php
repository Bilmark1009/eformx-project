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
        $totalAttempts = $this->attempts()->count();
        $completedAttempts = $this->attempts()->where('status', 'completed')->count();
        $abandonedAttempts = $this->attempts()->where('status', 'abandoned')->count();
        $recentActivity = $this->attempts()->where('created_at', '>=', now()->subDays(7))->count();

        return [
            'totalRespondents' => $completedAttempts,
            'completionRate' => $totalAttempts > 0 ? round(($completedAttempts / $totalAttempts) * 100, 1) : 0,
            'recentActivity' => $recentActivity,
            'totalAttempts' => $totalAttempts,
            'abandonedAttempts' => $abandonedAttempts,
        ];
    }
}
