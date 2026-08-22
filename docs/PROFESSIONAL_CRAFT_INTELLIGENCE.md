# Professional Craft Intelligence

Stage 27 turns tattoo-session conditions and owner-reviewed healing outcomes into traceable craft evidence. It does not infer technique quality from project labels, fresh photos alone, client sentiment alone, or test data.

## Evidence chain

Every eligible learning record follows this chain:

`real project → completed tattoo session → session craft record → submitted healing check-in → Joshua assessment → candidate pattern → evidence threshold → owner-reviewed recommendation`

The client portal continues to expose only the existing client-visible session summary and healing response. Machine settings, private technique notes, skin-response observations, and Joshua's assessment remain owner-only.

## Session craft record

The owner can record:

- project, client, appointment, session number, and approved design relationship;
- machine name and machine type;
- needle groupings;
- ink and wash setup;
- minimum and maximum voltage;
- techniques;
- body area and observed skin response;
- client response;
- fresh-result rating and linked fresh-result assets;
- Joshua's private assessment.

Completeness is calculated from eight evidence categories. Records below 70% completeness remain saved but cannot influence craft patterns.

## Healing assessment

A healing assessment is linked to one submitted client check-in and its tattoo session. It records:

- early-healing, late-healing, or healed phase;
- retention, saturation, line quality, and smoothness ratings;
- overall healed-outcome rating;
- whether a touch-up appears required;
- Joshua's assessment;
- summarized client feedback and linked evidence photos.

Only late-healing or healed assessments can enter the pattern evaluator. The workflow is operational craft documentation, not medical diagnosis or medical advice.

## Meaningful-pattern policy

Legacy evaluates needle-grouping and technique combinations against the neutral 3/5 healed-outcome reference. A combination remains a `candidate` until all of these are true:

- at least 3 completed, non-test, non-archived projects;
- at least 2 distinct clients;
- at least 10% observed healed-outcome lift over the neutral 3/5 reference;
- at least 65% calculated confidence;
- each contributing craft record is at least 70% complete.

Confidence combines support count, independent projects, independent clients, record completeness, and the observed no-touch-up rate. It never represents statistical proof or causation.

## Recommendations and autonomy

- Candidate patterns are visible but cannot generate recommendations.
- A promoted pattern may generate one internal `review_craft_setup` recommendation.
- The recommendation always requires owner judgment and approval.
- Wording uses “associated with,” never “caused by.”
- Legacy does not change a tattoo setup, design, appointment, client communication, or external system automatically.
- Saving a session craft record or late/healed owner assessment automatically runs the evaluator and records the run in the audit ledger.

## Data preservation

Stage 27 uses three additive tables:

- `session_craft_records`
- `healing_assessments`
- `craft_analysis_runs`

Existing clients, projects, sessions, healing check-ins, files, and alpha data are not rewritten or deleted.
