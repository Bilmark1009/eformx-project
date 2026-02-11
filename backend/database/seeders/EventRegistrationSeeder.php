<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Form;
use App\Models\FormResponse;
use Illuminate\Support\Carbon;

class EventRegistrationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Get a user to own the form (default to the test user)
        $user = User::where('email', 'test@example.com')->first();

        if (!$user) {
            $this->command->error('Test user "test@example.com" not found. Please run FormSeeder first.');
            return;
        }

        // 2. Create the Event Registration Form
        $form = Form::updateOrCreate(
            [
                'user_id' => $user->id,
                'title' => '2026 Tech Conference Registration',
            ],
            [
                'description' => 'Register for the upcoming 2026 Tech Conference. Please provide your details below.',
                'status' => 'active',
                'fields' => [
                    [
                        'id' => 'full_name',
                        'type' => 'text',
                        'label' => 'Full Name',
                        'required' => true,
                    ],
                    [
                        'id' => 'email',
                        'type' => 'email',
                        'label' => 'Email Address',
                        'required' => true,
                    ],
                    [
                        'id' => 'event_date',
                        'type' => 'select',
                        'label' => 'Which day will you attend?',
                        'options' => ['Day 1 (Oct 10)', 'Day 2 (Oct 11)', 'Both Days'],
                        'required' => true,
                    ],
                    [
                        'id' => 't_shirt_size',
                        'type' => 'select',
                        'label' => 'T-Shirt Size',
                        'options' => ['Small', 'Medium', 'Large', 'Extra Large'],
                        'required' => true,
                    ],
                    [
                        'id' => 'dietary_requirements',
                        'type' => 'textarea',
                        'label' => 'Dietary Requirements',
                        'required' => false,
                    ],
                ],
            ]
        );

        // 3. Create 10 mock responses
        $mockResponses = [
            [
                'name' => 'John Doe',
                'email' => 'john.doe@example.com',
                'data' => [
                    'full_name' => 'John Doe',
                    'email' => 'john.doe@example.com',
                    'event_date' => 'Both Days',
                    't_shirt_size' => 'Large',
                    'dietary_requirements' => 'None',
                ],
            ],
            [
                'name' => 'Jane Smith',
                'email' => 'jane.smith@example.com',
                'data' => [
                    'full_name' => 'Jane Smith',
                    'email' => 'jane.smith@example.com',
                    'event_date' => 'Day 1 (Oct 10)',
                    't_shirt_size' => 'Medium',
                    'dietary_requirements' => 'Vegetarian',
                ],
            ],
            [
                'name' => 'Michael Johnson',
                'email' => 'michael.j@example.com',
                'data' => [
                    'full_name' => 'Michael Johnson',
                    'email' => 'michael.j@example.com',
                    'event_date' => 'Day 2 (Oct 11)',
                    't_shirt_size' => 'Extra Large',
                    'dietary_requirements' => 'Gluten-free',
                ],
            ],
            [
                'name' => 'Sarah Williams',
                'email' => 'sarah.w@example.com',
                'data' => [
                    'full_name' => 'Sarah Williams',
                    'email' => 'sarah.w@example.com',
                    'event_date' => 'Both Days',
                    't_shirt_size' => 'Small',
                    'dietary_requirements' => 'None',
                ],
            ],
            [
                'name' => 'David Brown',
                'email' => 'david.b@example.com',
                'data' => [
                    'full_name' => 'David Brown',
                    'email' => 'david.b@example.com',
                    'event_date' => 'Day 1 (Oct 10)',
                    't_shirt_size' => 'Large',
                    'dietary_requirements' => 'Nut allergy',
                ],
            ],
            [
                'name' => 'Emily Davis',
                'email' => 'emily.d@example.com',
                'data' => [
                    'full_name' => 'Emily Davis',
                    'email' => 'emily.d@example.com',
                    'event_date' => 'Both Days',
                    't_shirt_size' => 'Medium',
                    'dietary_requirements' => 'None',
                ],
            ],
            [
                'name' => 'Christopher Wilson',
                'email' => 'chris.w@example.com',
                'data' => [
                    'full_name' => 'Christopher Wilson',
                    'email' => 'chris.w@example.com',
                    'event_date' => 'Day 2 (Oct 11)',
                    't_shirt_size' => 'Large',
                    'dietary_requirements' => 'Vegan',
                ],
            ],
            [
                'name' => 'Ashley Taylor',
                'email' => 'ashley.t@example.com',
                'data' => [
                    'full_name' => 'Ashley Taylor',
                    'email' => 'ashley.t@example.com',
                    'event_date' => 'Day 1 (Oct 10)',
                    't_shirt_size' => 'Small',
                    'dietary_requirements' => 'None',
                ],
            ],
            [
                'name' => 'James Anderson',
                'email' => 'james.a@example.com',
                'data' => [
                    'full_name' => 'James Anderson',
                    'email' => 'james.a@example.com',
                    'event_date' => 'Both Days',
                    't_shirt_size' => 'Extra Large',
                    'dietary_requirements' => 'No seafood',
                ],
            ],
            [
                'name' => 'Jessica Martinez',
                'email' => 'jessica.m@example.com',
                'data' => [
                    'full_name' => 'Jessica Martinez',
                    'email' => 'jessica.m@example.com',
                    'event_date' => 'Day 2 (Oct 11)',
                    't_shirt_size' => 'Medium',
                    'dietary_requirements' => 'None',
                ],
            ],
        ];

        foreach ($mockResponses as $index => $response) {
            FormResponse::create([
                'form_id' => $form->id,
                'respondent_name' => $response['name'],
                'respondent_email' => $response['email'],
                'responses' => $response['data'],
                'created_at' => Carbon::now()->subDays(10 - $index)->subHours(rand(1, 23)),
            ]);
        }

        $this->command->info('Event Registration Form and 10 mock responses created successfully!');
    }
}
