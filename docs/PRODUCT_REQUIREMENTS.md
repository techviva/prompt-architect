# Product Requirements — Prompt Architect

## Overview
Prompt Architect is a web application that transforms voice-recorded ideas into optimized, platform-specific AI prompts. Users record or upload audio describing their task, and the system transcribes, analyzes, classifies, and generates tailored prompts for their chosen AI platform.

## Core Value Proposition
- **Voice-first input**: Speak your idea, get a structured prompt
- **Intelligent routing**: Automatic platform and model recommendation
- **Complexity assessment**: Understand what your task requires before starting
- **Platform optimization**: Prompts tailored to ChatGPT, Claude, Gemini, or generic use
- **Continuity**: Pick up where you left off with revision and follow-up prompts

## User Personas
1. **Power AI User**: Uses multiple AI platforms daily, needs optimized prompts per platform
2. **Non-technical User**: Has ideas but struggles to write effective prompts
3. **Team Lead**: Needs to delegate AI-assisted tasks with clear instructions

## Functional Requirements

### FR-1: Audio Upload & Processing
- Upload audio files (mp3, wav, m4a, webm, ogg) up to 100MB
- Visual upload progress indicator
- Asynchronous processing with real-time status updates
- Support for recordings 1 second to 60 minutes

### FR-2: Transcription
- Transcribe audio using Google Gemini
- Produce clean, readable transcript
- Handle multiple languages (best-effort)

### FR-3: Task Analysis
- Classify task type from taxonomy (research, writing, coding, etc.)
- Estimate complexity on 1-5 scale with explanations
- Identify required capabilities and missing information
- Flag risks and warnings

### FR-4: Platform Recommendation
- Suggest optimal platform (ChatGPT, Claude, Gemini, Generic)
- Suggest specific model within platform
- Suggest working methodology
- Allow user override at any point

### FR-5: Prompt Generation
- Generate platform-optimized initial prompt
- Generate follow-up prompt for continuations
- Generate revision prompt for changes
- Use structured templates per platform

### FR-6: History & Continuity
- Persist all processed requests
- Search and filter history
- Duplicate previous requests
- "Continue from here" workflow with additional context

### FR-7: User Interface
- Responsive, mobile-first design
- Professional, clean aesthetic
- Touch-friendly on mobile
- Easy copy-to-clipboard for all prompts
- Real-time job status feedback

## Non-Functional Requirements
- **Performance**: Audio processing within 2 minutes for typical recordings
- **Reliability**: Retry logic for AI API calls, graceful error handling
- **Security**: Input validation, file type verification, no client-side secrets
- **Portability**: Self-hostable via Docker Compose, no vendor lock-in
- **Maintainability**: Clean architecture, typed contracts, documented decisions

## Pages
1. **Dashboard** — Overview, recent requests, quick actions
2. **New Request** — Audio upload, context, platform selection
3. **Result Detail** — Full analysis output with all prompts
4. **History** — Searchable, filterable list of past requests
5. **History Item** — Detail view of a historical request
6. **Settings** — User preferences, API configuration
7. **System Health** — Service status overview

## Out of Scope for MVP
- Real-time audio recording in browser
- Multi-user authentication (prepared but not implemented)
- Billing or usage limits
- Third-party integrations beyond Gemini
- Prompt execution (actually running prompts on target platforms)
