# Design media and analysis

Stage 5 turns stored project files into a controlled creative-media workflow without replacing R2 or exposing private object URLs.

## Asset boundary

Every upload is connected to a project and carries a role, visibility, rights status, consent status, integrity hash, and immutable version lineage. Client uploads are always classified as client references and remain scoped to that client. Owner uploads require an explicit tattoo-specific role.

Supported roles include client and artist references, body photos, mockups, design iterations, final designs, stencils, session photos, fresh and healed tattoo photos, content assets, consent documents, and other project files.

Changing classification never changes the stored original, SHA-256 digest, or version ancestry. Sharing an asset with a client changes only its visibility metadata. Content eligibility requires an eligible tattoo/content role, studio-created or authorized rights, and explicit granted client consent.

## Design lineage and approval

An owner can upload an independent design or select an existing design as the parent of a new version. Legacy OS assigns the next version number within that lineage and preserves both files.

Client design approval is limited to mockups, design iterations, final designs, and stencils. The approval stores the exact asset ID, version, and SHA-256 digest. Repeated requests for the same pending version are idempotent. The client portal renders that exact authorized artifact before a decision is made.

## Visual analysis

Visual analysis is an explicit owner action and is available only for image assets classified as a mockup, design iteration, final design, or stencil with studio-created or authorized rights. Legacy OS does not pretend to analyze an image when no vision-capable model is configured.

When configured, the design-analysis service sends the selected image and bounded project-safe metadata through the model adapter. It records the provider, model, prompt policy, asset hash, asset version, evidence, confidence, latency, audit event, and AI Operations run. The model may offer observations and questions, but the artist remains the final creative authority.

Set `AI_VISION_MODEL` when the primary `AI_MODEL` is not vision capable. Existing provider credentials remain server-side.
