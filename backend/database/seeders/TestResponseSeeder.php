<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Form;
use App\Models\FormResponse;

class TestResponseSeeder extends Seeder
{
    /**
     * Run the database seeder.
     */
    public function run(): void
    {
        $user = User::where('email', 'test@example.com')->first();
        if (!$user) {
            $this->command->error('User test@example.com not found.');
            return;
        }

        $form1 = Form::where('user_id', $user->id)->where('title', 'Annual Tech Conference Registration')->first();
        $form2 = Form::where('user_id', $user->id)->where('title', 'Customer Experience & Product Feedback')->first();

        if ($form1) {
            $this->seedResponsesForm1($form1);
            $this->command->info('Seeded 10 responses for ' . $form1->title);
        }

        if ($form2) {
            $this->seedResponsesForm2($form2);
            $this->command->info('Seeded 10 responses for ' . $form2->title);
        }
    }

    private function seedResponsesForm1($form)
    {
        $names = ['Alice Johnson', 'Bob Smith', 'Charlie Davis', 'Diana Prince', 'Ethan Hunt', 'Fiona Gallagher', 'George Clooney', 'Hannah Montana', 'Ian McKellen', 'Jane Doe'];
        $companies = ['Tech Innovators', 'Cloud Systems', 'Data Experts', 'Startup Hub', 'Global Solutions', 'Future Corp', 'Dev Ops Inc', 'Web Wizards', 'AI Labs', 'Soft Works'];
        $roles = ['Senior Dev', 'CTO', 'Lead Engineer', 'Frontend Specialist', 'Backend Architect', 'Project Manager', 'Solutions Architect', 'Data Scientist', 'Designer', 'HR Manager'];

        foreach ($names as $index => $name) {
            FormResponse::create([
                'form_id' => $form->id,
                'respondent_name' => $name,
                'respondent_email' => strtolower(str_replace(' ', '.', $name)) . '@example.com',
                'responses' => [
                    'full_name' => $name,
                    'job_title' => $roles[$index],
                    'organization' => $companies[$index],
                    'dietary_req' => ['None', 'Vegetarian', 'Vegan', 'Halal'][$index % 4],
                    'tshirt_size' => ['S', 'M', 'L', 'XL'][$index % 4],
                    'experience_level' => ['Junior', 'Mid-Level', 'Senior', 'Lead/Manager'][$index % 4],
                    'workshop_interest' => [['AI/ML Prep', 'Modern DevOps'], ['Web3 Fundamentals'], ['Architecture Patterns', 'AI/ML Prep']][$index % 3],
                    'phone_number' => '0912345678' . $index,
                    'github_profile' => 'https://github.com/' . strtolower(str_replace(' ', '', $name)),
                    'bio' => 'Passionate professional with experience in building scalable web applications.'
                ]
            ]);
        }
    }

    private function seedResponsesForm2($form)
    {
        $names = ['Kevin Heart', 'Laura Palmer', 'Mike Wazowski', 'Nina Simone', 'Oscar Isaac', 'Penny Lane', 'Quentin Tarantino', 'Riley Reid', 'Steve Rogers', 'Tony Stark'];

        foreach ($names as $index => $name) {
            FormResponse::create([
                'form_id' => $form->id,
                'respondent_name' => $name,
                'respondent_email' => strtolower(str_replace(' ', '.', $name)) . '@user.test',
                'responses' => [
                    'usage_frequency' => ['Daily', 'Weekly', 'Monthly'][rand(0, 2)],
                    'ease_of_use' => rand(7, 10),
                    'favorite_feature' => ['Analytics', 'Custom Builder', 'API Access', 'Fast Loading'][rand(0, 3)],
                    'ui_rating' => ['Very Satisfied', 'Satisfied'][rand(0, 1)],
                    'performance_rating' => ['Excellent', 'Good'][rand(0, 1)],
                    'bug_frequency' => ['Never', 'Rarely'][rand(0, 1)],
                    'support_rating' => rand(8, 10),
                    'future_recommend' => '10 (Definitely)',
                    'pricing_feedback' => 'Seems fair for the value provided.',
                    'suggestions' => 'Keep up the good work! Maybe add dark mode.'
                ]
            ]);
        }
    }
}
