# 06 — Data model
synapse.v1 = { name, exam, examDate, onboarded, streak, hoursToday, casesSolved, note,
  tasks: [{id,text,done}], revision: [{id,topic,subject,prio,due,done}],
  week: [{day,h,today}], caseIndex }
All sample content is fictional. CASES[] is a constant of 3 fictional teaching vignettes.
