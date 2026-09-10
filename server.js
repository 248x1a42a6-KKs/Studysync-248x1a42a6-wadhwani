require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GOOGLE_API_KEY;
const MODEL = process.env.GOOGLE_MODEL || 'gemini-2.0-flash';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate-plan', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server is missing GOOGLE_API_KEY. Set it in your .env file.' });
  }

  const { subjects, hoursPerDay, numDays } = req.body;

  if (!Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: 'Provide at least one subject.' });
  }

  const validSubjects = subjects.filter((s) => s.name && s.examDate);
  if (validSubjects.length === 0) {
    return res.status(400).json({ error: 'Each subject needs a name and exam date.' });
  }

  const days = Math.min(7, Math.max(1, Number(numDays) || 7));

  const todayStr = new Date().toISOString().split('T')[0];
  const subjectLines = validSubjects
    .map((s) => `- ${s.name}${s.examBoard ? ` (${s.examBoard})` : ''}: exam on ${s.examDate}`)
    .join('\n');

  const prompt = `You are building a ${days}-day study plan for a student.

STEP 1 — Recall the real syllabus.
For each subject below, use your own knowledge of the actual, standard syllabus / chapter list / exam
pattern (if an exam or board is named, use that specific one, e.g. "JEE Main Physics syllabus" or
"CBSE Class 12 Chemistry syllabus"). If no exam/board is given, use the standard syllabus/curriculum for
that subject at an appropriate level. Identify real chapter/unit/topic names — do not invent generic
placeholders like "core concepts".

STEP 2 — Build the plan.
Using the real topics you identified, create a ${days}-day study plan.

Subjects and exam dates:
${subjectLines}

Today's date: ${todayStr}
Study time available: ${hoursPerDay || 3} hours per day

Instructions:
- Plan the next ${days} day${days === 1 ? '' : 's'} starting today.
- Each day, assign 1-3 subjects with a specific, concrete focus area pulled directly from the real
  syllabus you identified (e.g. "Kinematics: relative motion numericals", not "study physics" or "core concepts").
- Don't repeat the same topic across two days unless it's large enough to need it.
- Hours per day should sum to roughly ${hoursPerDay || 3}.
- Prioritize subjects with nearer exam dates, but don't fully neglect others.
- The "plan" array must contain exactly ${days} entr${days === 1 ? 'y' : 'ies'} (one per day).
- Respond with ONLY valid JSON, no markdown fences, no extra text before or after, in exactly this shape:
{"plan":[{"date":"YYYY-MM-DD","day":"Mon","blocks":[{"subject":"Physics","focus":"Kinematics: relative motion numericals","hours":1.5}]}]}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Google API error:', errText);
      return res.status(502).json({ error: 'AI service error. Try again.' });
    }

    const data = await response.json();
    // Gemini returns the text under candidates[0].content.parts[0].text
    // when responseMimeType is application/json.
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown code fences if present (smaller models sometimes add them
    // despite instructions not to).
    const fenceStripped = text.replace(/```json\s*/gi, '').replace(/```/g, '');

    // Smaller models sometimes echo raw tool-call/search debug output as text
    // before their final answer, which contains its own unrelated '{...}'
    // blocks. So instead of grabbing the first brace pair in the whole text,
    // anchor specifically on the last `{"plan":` (the key we asked for) and
    // brace-match from there — this skips over any earlier JSON-looking noise.
    const planKeyMatch = /\{\s*"plan"\s*:/g;
    let lastPlanKeyIndex = -1;
    let m;
    while ((m = planKeyMatch.exec(fenceStripped)) !== null) {
      lastPlanKeyIndex = m.index;
    }

    const start = lastPlanKeyIndex !== -1 ? lastPlanKeyIndex : fenceStripped.indexOf('{');
    let jsonStr = null;
    if (start !== -1) {
      let depth = 0;
      for (let i = start; i < fenceStripped.length; i++) {
        if (fenceStripped[i] === '{') depth++;
        else if (fenceStripped[i] === '}') {
          depth--;
          if (depth === 0) {
            jsonStr = fenceStripped.slice(start, i + 1);
            break;
          }
        }
      }
    }

    if (!jsonStr) {
      console.error('No JSON found in model response:', text);
      return res.status(502).json({ error: 'Could not parse plan. Try again.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('JSON parse failed. Raw text was:', text);
      console.error('Extracted JSON string was:', jsonStr);
      return res.status(502).json({ error: 'Could not parse plan. Try again.' });
    }

    if (!parsed.plan || !Array.isArray(parsed.plan)) {
      return res.status(502).json({ error: 'Unexpected plan format. Try again.' });
    }

    res.json(parsed);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong generating the plan.' });
  }
});

app.listen(PORT, () => {
  console.log(`StudySync running at http://localhost:${PORT}`);
});
         
