<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Form;
use Illuminate\Support\Facades\Hash;

class TestFormSeeder extends Seeder
{
    /**
     * Run the database seeder.
     */
    public function run(): void
    {
        // 1. Create or get the test user
        $user = User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'role' => 'Admin',
                'status' => 'Active',
            ]
        );

        // 2. Create Form 1: Comprehensive Event Registration
        Form::create([
            'user_id' => $user->id,
            'title' => 'Annual Tech Conference Registration',
            'description' => 'Please provide your details to register for the upcoming Annual Tech Conference 2026.',
            'status' => 'active',
            'fields' => [
                ['id' => 'full_name', 'type' => 'text', 'label' => 'Full Name', 'required' => true],
                ['id' => 'job_title', 'type' => 'text', 'label' => 'Job Title', 'required' => true],
                ['id' => 'organization', 'type' => 'text', 'label' => 'Organization/Company', 'required' => true],
                ['id' => 'dietary_req', 'type' => 'select', 'label' => 'Dietary Requirements', 'options' => ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal'], 'required' => false],
                ['id' => 'tshirt_size', 'type' => 'radio', 'label' => 'T-Shirt Size', 'options' => ['S', 'M', 'L', 'XL', 'XXL'], 'required' => true],
                ['id' => 'experience_level', 'type' => 'select', 'label' => 'Professional Experience', 'options' => ['Junior', 'Mid-Level', 'Senior', 'Lead/Manager'], 'required' => true],
                ['id' => 'workshop_interest', 'type' => 'checkbox', 'label' => 'Workshops you wish to attend', 'options' => ['AI/ML Prep', 'Modern DevOps', 'Web3 Fundamentals', 'Architecture Patterns'], 'required' => false],
                ['id' => 'phone_number', 'type' => 'number', 'label' => 'Emergency Contact Number', 'required' => true],
                ['id' => 'github_profile', 'type' => 'text', 'label' => 'GitHub Profile URL', 'required' => false],
                ['id' => 'bio', 'type' => 'textarea', 'label' => 'Short Bio for Badge', 'required' => false],
            ]
        ]);

        // 3. Create Form 2: Detailed Customer Satisfaction Survey
        Form::create([
            'user_id' => $user->id,
            'title' => 'Customer Experience & Product Feedback',
            'description' => 'Help us improve our services by sharing your honest feedback about our latest product release.',
            'status' => 'active',
            'fields' => [
                ['id' => 'usage_frequency', 'type' => 'select', 'label' => 'How often do you use our product?', 'options' => ['Daily', 'Weekly', 'Monthly', 'Rarely'], 'required' => true],
                ['id' => 'ease_of_use', 'type' => 'number', 'label' => 'Rate Ease of Use (1-10)', 'required' => true],
                ['id' => 'favorite_feature', 'type' => 'text', 'label' => 'Most used feature?', 'required' => true],
                ['id' => 'ui_rating', 'type' => 'radio', 'label' => 'Design/UI Satisfaction', 'options' => ['Very Satisfied', 'Satisfied', 'Neutral', 'Unsatisfied'], 'required' => true],
                ['id' => 'performance_rating', 'type' => 'radio', 'label' => 'Product Speed/Performance', 'options' => ['Excellent', 'Good', 'Fair', 'Poor'], 'required' => true],
                ['id' => 'bug_frequency', 'type' => 'select', 'label' => 'How often do you encounter bugs?', 'options' => ['Never', 'Rarely', 'Sometimes', 'Often'], 'required' => true],
                ['id' => 'support_rating', 'type' => 'number', 'label' => 'Rate Customer Support (1-10)', 'required' => false],
                ['id' => 'future_recommend', 'type' => 'radio', 'label' => 'Likelihood to recommend (NPS)', 'options' => ['10 (Definitely)', '7-9 (Likely)', '4-6 (Neutral)', '0-3 (Unlikely)'], 'required' => true],
                ['id' => 'pricing_feedback', 'type' => 'textarea', 'label' => 'Feedback on Pricing structure', 'required' => false],
                ['id' => 'suggestions', 'type' => 'textarea', 'label' => 'General suggestions for improvement', 'required' => false],
            ]
        ]);
    }
}
