<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Chart\Chart;
use PhpOffice\PhpSpreadsheet\Chart\DataSeries;
use PhpOffice\PhpSpreadsheet\Chart\DataSeriesValues;
use PhpOffice\PhpSpreadsheet\Chart\Legend;
use PhpOffice\PhpSpreadsheet\Chart\Layout;
use PhpOffice\PhpSpreadsheet\Chart\PlotArea;
use PhpOffice\PhpSpreadsheet\Chart\Title;

class FormController extends Controller
{
    /**
     * Display a listing of the user's forms.
     */
    public function index()
    {
        /** @var User $user */
        $user = Auth::user();
        $forms = $user->forms()->with('responses')->latest()->get();


        return response()->json($forms);
    }

    /**
     * Store a newly created form.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'fields' => 'nullable|array',
            'status' => 'nullable|in:draft,active,closed',
        ]);

        /** @var User $user */
        $user = Auth::user();
        $form = $user->forms()->create($validated);
        $form->load('responses'); // Eager load responses for consistency

        // Notify owner about new form creation
        try {
            Notification::create([
                'title' => 'New form created',
                'message' => 'Form "'.$form->title.'" was created.',
                'type' => 'success',
                'recipient_user_id' => $user->id,
            ]);
        } catch (\Throwable $e) {
            // swallow notification errors
        }

        return response()->json($form, 201);
    }

    /**
     * Display the specified form with responses.
     */
    public function show($id)
    {
        /** @var User $user */
        $user = Auth::user();
        $form = $user->forms()->with('responses')->findOrFail($id);

        return response()->json($form);
    }

    /**
     * Display the specified form for public filling (no auth required).
     */
    public function showPublic($id)
    {
        $form = Form::findOrFail($id);

        // Only allow active forms to be viewed publicly
        if ($form->status !== 'active') {
            return response()->json(['message' => 'This form is currently inactive and not accepting responses.'], 403);
        }

        // Return only necessary fields for public view
        return response()->json([
            'id' => $form->id,
            'title' => $form->title,
            'description' => $form->description,
            'fields' => $form->fields,
            'status' => $form->status,
        ]);
    }

    /**
     * Update the specified form.
     */
    public function update(Request $request, $id)
    {
        /** @var User $user */
        $user = Auth::user();
        $form = $user->forms()->findOrFail($id);

        $previousStatus = $form->status;

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'fields' => 'nullable|array',
            'status' => 'nullable|in:draft,active,closed',
        ]);

        $form->update($validated);
        $form->load('responses'); // Refresh and eager load

        // Notify owner if form status changes (active or closed/draft)
        if (array_key_exists('status', $validated) && $validated['status'] !== $previousStatus) {
            try {
                $status = $validated['status'];
                $type = ($status === 'active') ? 'success' : 'warning';
                Notification::create([
                    'title' => 'Form status changed',
                    'message' => 'Form "'.$form->title.'" is now '.$status.'.',
                    'type' => $type,
                    'recipient_user_id' => $user->id,
                ]);
            } catch (\Throwable $e) {
                // swallow notification errors
            }
        }

        return response()->json($form);
    }

    /**
     * Remove the specified form.
     */
    public function destroy($id)
    {
        /** @var User $user */
        $user = Auth::user();
        $form = $user->forms()->findOrFail($id);
        $form->delete();

        return response()->json(['message' => 'Form deleted successfully'], 200);
    }

    /**
     * Get analytics for a specific form.
     */
    public function analytics($id)
    {
        /** @var User $user */
        $user = Auth::user();
        $form = $user->forms()->findOrFail($id);

        return response()->json([
            'form_id' => $form->id,
            'title' => $form->title,
            'analytics' => $form->analytics,
        ]);
    }

    /**
     * Export aggregate analytics as CSV (question-level counts and percentages).
     */
    public function exportAnalyticsCsv($id)
    {
        /** @var User $user */
        $user = Auth::user();
        $form = $user->forms()->with('responses')->findOrFail($id);

        [$fieldOrder, $aggregates] = $this->buildAggregates($form);

        $lines = [];
        $lines[] = ['Question', 'Answer', 'Count', 'Percentage'];

        foreach ($fieldOrder as $field) {
            $bucket = $aggregates[$field['id']] ?? null;
            $total = $bucket['total'] ?? 0;
            $answers = $bucket['answers'] ?? [];

            if (empty($answers)) {
                $lines[] = [$field['label'], '', 0, '0%'];
                continue;
            }

            foreach ($answers as $answerText => $count) {
                $percent = $total > 0 ? number_format(($count / $total) * 100, 2) . '%' : '0%';
                $lines[] = [$field['label'], $answerText, $count, $percent];
            }
        }

        $csv = '';
        foreach ($lines as $line) {
            $csv .= collect($line)
                ->map(fn($cell) => '"' . str_replace('"', '""', (string) $cell) . '"')
                ->implode(',') . "\n";
        }

        $filename = $this->safeFilename($form->title ?: 'form') . '_analytics.csv';

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Export analytics as XLSX with embedded chart.
     */
    public function exportAnalyticsXlsx($id)
    {
        /** @var User $user */
        $user = Auth::user();
        $form = $user->forms()->with('responses')->findOrFail($id);

        [$fieldOrder, $aggregates] = $this->buildAggregates($form);

        $spreadsheet = new Spreadsheet();

        // Summary sheet
        $summarySheet = $spreadsheet->getActiveSheet();
        $summarySheet->setTitle('Summary');
        $summarySheet->setCellValue('A1', 'Form');
        $summarySheet->setCellValue('B1', $form->title);
        $summarySheet->setCellValue('A2', 'Total Respondents');
        $summarySheet->setCellValue('B2', $form->analytics['totalRespondents'] ?? 0);
        $summarySheet->setCellValue('A3', 'Completion Rate');
        $summarySheet->setCellValue('B3', ($form->analytics['completionRate'] ?? 0) . '%');
        $summarySheet->setCellValue('A4', 'Recent Activity (7d)');
        $summarySheet->setCellValue('B4', $form->analytics['recentActivity'] ?? 0);

        // Totals per question for chart
        $summarySheet->setCellValue('A6', 'Question');
        $summarySheet->setCellValue('B6', 'Responses');
        $row = 7;
        foreach ($fieldOrder as $field) {
            $summarySheet->setCellValue('A' . $row, $field['label']);
            $total = $aggregates[$field['id']]['total'] ?? 0;
            $summarySheet->setCellValue('B' . $row, $total);
            $row++;
        }
        $endRow = $row - 1;

        // Answer breakdown sheet
        $breakdownSheet = new Worksheet($spreadsheet, 'Answer Breakdown');
        $spreadsheet->addSheet($breakdownSheet);
        $breakdownSheet->setCellValue('A1', 'Question');
        $breakdownSheet->setCellValue('B1', 'Answer');
        $breakdownSheet->setCellValue('C1', 'Count');
        $breakdownSheet->setCellValue('D1', 'Percentage');

        $r = 2;
        $questionBlocks = [];
        foreach ($fieldOrder as $field) {
            $blockStart = $r;
            $bucket = $aggregates[$field['id']] ?? ['total' => 0, 'answers' => []];
            $total = $bucket['total'] ?? 0;
            $answers = $bucket['answers'] ?? [];

            if (empty($answers)) {
                $breakdownSheet->setCellValue('A' . $r, $field['label']);
                $breakdownSheet->setCellValue('B' . $r, '');
                $breakdownSheet->setCellValue('C' . $r, 0);
                $breakdownSheet->setCellValue('D' . $r, '0%');
                $r++;
                $questionBlocks[] = [
                    'label' => $field['label'],
                    'start' => $blockStart,
                    'end' => $r - 1,
                ];
                continue;
            }

            foreach ($answers as $answerText => $count) {
                $percent = $total > 0 ? number_format(($count / $total) * 100, 2) . '%' : '0%';
                $breakdownSheet->setCellValue('A' . $r, $field['label']);
                $breakdownSheet->setCellValue('B' . $r, $answerText);
                $breakdownSheet->setCellValue('C' . $r, $count);
                $breakdownSheet->setCellValue('D' . $r, $percent);
                $r++;
            }

            $questionBlocks[] = [
                'label' => $field['label'],
                'start' => $blockStart,
                'end' => $r - 1,
            ];
        }

        // Build charts aligned to dashboard styling (donut + column)
        if ($endRow >= 7) {
            $labelRange = 'Summary!A7:A' . $endRow;
            $valueRange = 'Summary!B7:B' . $endRow;

            $labels = [new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_STRING, $labelRange, null, $endRow - 6)];
            $categories = [new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_STRING, $labelRange, null, $endRow - 6)];
            $values = [new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_NUMBER, $valueRange, null, $endRow - 6)];

            // Donut chart for share distribution
            $donutLayout = new Layout();
            $donutLayout->setShowPercent(true);

            $donutSeries = new DataSeries(
                DataSeries::TYPE_DONUTCHART,
                null,
                range(0, count($values) - 1),
                $labels,
                $categories,
                $values
            );

            $donutPlotArea = new PlotArea($donutLayout, [$donutSeries]);
            $donutLegend = new Legend(Legend::POSITION_BOTTOM, null, false);
            $donutTitle = new Title('Response Distribution');

            $donutChart = new Chart('responses_donut', $donutTitle, $donutLegend, $donutPlotArea, true, 'gap', null, null);
            $donutChart->setTopLeftPosition('C2');
            $donutChart->setBottomRightPosition('H22');

            // Column chart for per-question totals
            $columnLayout = new Layout();
            $columnLayout->setShowVal(true);

            $columnSeries = new DataSeries(
                DataSeries::TYPE_BARCHART,
                DataSeries::GROUPING_CLUSTERED,
                range(0, count($values) - 1),
                $labels,
                $categories,
                $values
            );
            $columnSeries->setPlotDirection(DataSeries::DIRECTION_COL);

            $columnPlotArea = new PlotArea($columnLayout, [$columnSeries]);
            $columnLegend = new Legend(Legend::POSITION_RIGHT, null, false);
            $columnTitle = new Title('Responses per Question');

            $columnChart = new Chart('question_totals', $columnTitle, $columnLegend, $columnPlotArea, true, 'gap', null, null);
            $columnChart->setTopLeftPosition('I2');
            $columnChart->setBottomRightPosition('P22');

            $summarySheet->addChart($donutChart);
            $summarySheet->addChart($columnChart);

            // Add first question breakdown chart onto Summary for quick answer-level view
            if (!empty($questionBlocks)) {
                $first = $questionBlocks[0];
                if ($first['end'] >= $first['start']) {
                    $ansRange = "'Answer Breakdown'!B" . $first['start'] . ':B' . $first['end'];
                    $cntRange = "'Answer Breakdown'!C" . $first['start'] . ':C' . $first['end'];

                    $qbCategories = [new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_STRING, $ansRange, null, ($first['end'] - $first['start']) + 1)];
                    $qbValues = [new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_NUMBER, $cntRange, null, ($first['end'] - $first['start']) + 1)];

                    $qbLayout = new Layout();
                    $qbLayout->setShowVal(true);

                    $qbSeries = new DataSeries(
                        DataSeries::TYPE_BARCHART,
                        DataSeries::GROUPING_CLUSTERED,
                        range(0, count($qbValues) - 1),
                        [],
                        $qbCategories,
                        $qbValues
                    );
                    $qbSeries->setPlotDirection(DataSeries::DIRECTION_COL);

                    $qbPlotArea = new PlotArea($qbLayout, [$qbSeries]);
                    $qbLegend = new Legend(Legend::POSITION_RIGHT, null, false);
                    $qbTitle = new Title('Answer Breakdown - ' . $first['label']);

                    $qbChart = new Chart('answer_breakdown_primary', $qbTitle, $qbLegend, $qbPlotArea, true, 'gap', null, null);
                    $qbChart->setTopLeftPosition('C24');
                    $qbChart->setBottomRightPosition('H42');

                    $summarySheet->addChart($qbChart);
                }
            }
        }

        // Add per-question answer breakdown charts on the breakdown sheet
        $chartOffsetRow = 2;
        $chartHeight = 16; // rows
        foreach ($questionBlocks as $index => $block) {
            if ($block['end'] < $block['start']) {
                continue;
            }

            $ansRange = 'B' . $block['start'] . ':B' . $block['end'];
            $cntRange = 'C' . $block['start'] . ':C' . $block['end'];

            $categories = [new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_STRING, "'Answer Breakdown'!" . $ansRange, null, ($block['end'] - $block['start']) + 1)];
            $values = [new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_NUMBER, "'Answer Breakdown'!" . $cntRange, null, ($block['end'] - $block['start']) + 1)];

            $layout = new Layout();
            $layout->setShowVal(true);
            $layout->setShowPercent(true);

            $series = new DataSeries(
                DataSeries::TYPE_BARCHART,
                DataSeries::GROUPING_CLUSTERED,
                range(0, count($values) - 1),
                [],
                $categories,
                $values
            );
            $series->setPlotDirection(DataSeries::DIRECTION_COL);

            $plotArea = new PlotArea($layout, [$series]);
            $legend = new Legend(Legend::POSITION_RIGHT, null, false);
            $title = new Title('Answer Breakdown - ' . $block['label']);

            $chart = new Chart('answer_breakdown_' . $index, $title, $legend, $plotArea, true, 'gap', null, null);

            // Position charts in a single column to avoid overlap, next to the data table
            $topRow = $chartOffsetRow;
            $bottomRow = $chartOffsetRow + $chartHeight;
            $chart->setTopLeftPosition('F' . $topRow);
            $chart->setBottomRightPosition('L' . $bottomRow);

            $breakdownSheet->addChart($chart);

            $chartOffsetRow = $bottomRow + 2; // add spacing before next chart
        }

        $writer = new Xlsx($spreadsheet);
        $writer->setIncludeCharts(true);

        ob_start();
        $writer->save('php://output');
        $xlsxData = ob_get_clean();

        $filename = $this->safeFilename($form->title ?: 'form') . '_analytics.xlsx';

        return response($xlsxData, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Normalize and aggregate answers per question.
     */
    private function buildAggregates(Form $form): array
    {
        $fields = $form->fields ?? [];
        $fieldOrder = [];

        // Map field metadata by ID so we can apply type-specific aggregation rules
        $fieldMeta = [];
        foreach ($fields as $idx => $field) {
            $id = (string) ($field['id'] ?? $field['name'] ?? 'q' . ($idx + 1));
            $label = $field['label'] ?? $field['title'] ?? $field['question'] ?? $field['name'] ?? ('Question ' . ($idx + 1));
            $type = isset($field['type']) ? strtolower((string) $field['type']) : 'text';
            $options = isset($field['options']) && is_array($field['options']) ? $field['options'] : [];
            $choiceType = isset($field['choiceType']) ? strtolower((string) $field['choiceType']) : null;

            $fieldOrder[] = ['id' => $id, 'label' => $label];
            $fieldMeta[$id] = [
                'label' => $label,
                'type' => $type,
                'options' => $options,
                'choiceType' => $choiceType,
            ];
        }

        $aggregates = [];
        foreach ($fieldOrder as $field) {
            $id = $field['id'];
            $meta = $fieldMeta[$id] ?? ['type' => 'text', 'options' => []];

            $aggregates[$id] = [
                'total' => 0,
                'answers' => [],
            ];

            // Pre-seed answer buckets for choice-based questions so that
            // options with zero responses still appear in the export.
            if (in_array($meta['type'], ['multiple-choice', 'select', 'radio'], true)) {
                foreach ($meta['options'] as $opt) {
                    $label = (string) $opt;
                    if ($label === '') {
                        continue;
                    }
                    $aggregates[$id]['answers'][$label] = 0;
                }
            }
        }

        // Aggregate responses per question / per answer value
        foreach ($form->responses as $response) {
            $entries = $this->normalizeAnswerEntries($response->responses);
            foreach ($entries as $entry) {
                $key = (string) ($entry['id'] ?? '');
                if (!isset($aggregates[$key])) {
                    continue;
                }

                $meta = $fieldMeta[$key] ?? ['type' => 'text', 'choiceType' => null, 'options' => []];
                $value = $entry['value'] ?? null;

                // Skip completely empty answers
                if ($value === null || $value === '') {
                    continue;
                }

                $type = $meta['type'];
                $choiceType = $meta['choiceType'];

                // Multi-select (checkbox) questions: count each selected option
                if ($type === 'multiple-choice' && $choiceType === 'checkbox' && is_array($value)) {
                    $selected = array_filter($value, static function ($v) {
                        return $v !== null && $v !== '' && !is_array($v);
                    });

                    if (empty($selected)) {
                        continue;
                    }

                    $aggregates[$key]['total'] += 1;
                    foreach ($selected as $v) {
                        $label = (string) $v;
                        if ($label === '') {
                            continue;
                        }
                        if (!array_key_exists($label, $aggregates[$key]['answers'])) {
                            $aggregates[$key]['answers'][$label] = 0;
                        }
                        $aggregates[$key]['answers'][$label] += 1;
                    }

                    continue;
                }

                // Any other array value (e.g. generic multi-select): count each entry separately
                if (is_array($value)) {
                    $flat = array_filter($value, static function ($v) {
                        return $v !== null && $v !== '' && !is_array($v);
                    });

                    if (empty($flat)) {
                        continue;
                    }

                    $aggregates[$key]['total'] += 1;
                    foreach ($flat as $v) {
                        $label = (string) $v;
                        if ($label === '') {
                            continue;
                        }
                        if (!array_key_exists($label, $aggregates[$key]['answers'])) {
                            $aggregates[$key]['answers'][$label] = 0;
                        }
                        $aggregates[$key]['answers'][$label] += 1;
                    }

                    continue;
                }

                // Scalar value: single answer per respondent for this question
                $answerText = $this->formatAnswerValue($value);
                if ($answerText === '') {
                    continue;
                }

                $aggregates[$key]['total'] += 1;
                if (!array_key_exists($answerText, $aggregates[$key]['answers'])) {
                    $aggregates[$key]['answers'][$answerText] = 0;
                }
                $aggregates[$key]['answers'][$answerText] += 1;
            }
        }

        // Post-process rating-style questions so that all scale points appear
        // even if they were never selected. For now we support the common 1-5
        // scale, detected either via explicit type or via label pattern.
        foreach ($fieldOrder as $field) {
            $id = $field['id'];
            $meta = $fieldMeta[$id] ?? ['type' => 'text'];

            $isRatingType = in_array($meta['type'], ['rating', 'number'], true);
            $labelIndicatesOneToFive = preg_match('/1\s*-\s*5/', $field['label']) === 1;

            if ($isRatingType || $labelIndicatesOneToFive) {
                if (!isset($aggregates[$id])) {
                    continue;
                }

                if (!isset($aggregates[$id]['answers'])) {
                    $aggregates[$id]['answers'] = [];
                }

                for ($score = 1; $score <= 5; $score++) {
                    $bucketKey = (string) $score;
                    if (!array_key_exists($bucketKey, $aggregates[$id]['answers'])) {
                        $aggregates[$id]['answers'][$bucketKey] = 0;
                    }
                }
            }
        }

        return [$fieldOrder, $aggregates];
    }

    private function normalizeAnswerEntries($responses): array
    {
        if (!$responses) {
            return [];
        }
        if (is_string($responses)) {
            $decoded = json_decode($responses, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $this->normalizeAnswerEntries($decoded);
            }
            return [['id' => 'answer', 'value' => $responses]];
        }
        if (is_array($responses)) {
            // If associative object
            $isAssoc = array_keys($responses) !== range(0, count($responses) - 1);
            if ($isAssoc) {
                $normalized = [];
                foreach ($responses as $id => $value) {
                    $normalized[] = ['id' => $id, 'value' => $value];
                }
                return $normalized;
            }

            $normalized = [];
            foreach ($responses as $idx => $entry) {
                if (is_array($entry)) {
                    $normalized[] = [
                        'id' => $entry['id'] ?? $entry['name'] ?? $entry['fieldId'] ?? 'q' . ($idx + 1),
                        'value' => $entry['value'] ?? $entry['answer'] ?? $entry['response'] ?? $entry,
                    ];
                } else {
                    $normalized[] = ['id' => 'q' . ($idx + 1), 'value' => $entry];
                }
            }
            return $normalized;
        }

        return [];
    }

    private function formatAnswerValue($value): string
    {
        if (is_array($value)) {
            $flat = array_filter($value, fn($v) => !is_array($v));
            return implode(', ', $flat);
        }
        if (is_object($value)) {
            return json_encode($value);
        }
        return (string) $value;
    }

    private function safeFilename(string $name): string
    {
        $name = preg_replace('/[^A-Za-z0-9\-_. ]/', '', $name);
        return trim($name) === '' ? 'form' : $name;
    }
}
