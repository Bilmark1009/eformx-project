<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\FormEngagement;

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

    // Relationship to form engagement events (views + submissions)
    public function engagements()
    {
        return $this->hasMany(FormEngagement::class);
    }

    // Computed analytics attribute
    public function getAnalyticsAttribute()
    {
        $totalRespondents = $this->responses()->count();
        $recentActivityCount = $this->responses()
            ->where('created_at', '>=', now()->subHour())
            ->count();

        $totalViews = $this->engagements()->count();
        $totalSubmissions = $this->engagements()
            ->where('status', 'submitted')
            ->count();

        // Fallback to response counts if engagements are not yet populated
        if ($totalSubmissions === 0 && $totalRespondents > 0) {
            $totalSubmissions = $totalRespondents;
        }
        if ($totalViews === 0 && $totalRespondents > 0) {
            $totalViews = $totalRespondents;
        }

        $responseRate = $totalViews > 0
            ? round(($totalSubmissions / $totalViews) * 100, 2)
            : 0;

        $recentActivityPercent = $totalRespondents > 0
            ? round(($recentActivityCount / $totalRespondents) * 100, 2)
            : 0;

        return [
            'totalRespondents' => $totalRespondents,
            'completionRate' => $responseRate,
            'recentActivity' => $recentActivityPercent,
            'totalViews' => $totalViews,
            'totalSubmissions' => $totalSubmissions,
            'responseRate' => $responseRate,
        ];
    }
}
