# FutureNow

**FutureNow helps Malaysian graduates and working adults explore future career opportunities, identify skill gaps, and plan their reskilling journey in an AI-driven job market.**

## Team Information

| Field             | Details                                |
|-------------------|----------------------------------------|
| Team Name         | KQ BuildLab                            |
| Team Domain       | Aiversecity: Future-Ready Workforce    |
| SDG Track         | SDG 8: Decent Work and Economic Growth |
| Team Leader       | Lai Kai Qi                             |
| University        | Universiti Malaysia Sarawak (UNIMAS)   |
| Number of Members | 1                                      |

## Links

| Resource          | Link                                        |
|-------------------|---------------------------------------------|
| GitHub Repository | https://github.com/kaiqi1004-star/FutureNow |
| Live Demo         | https://future-now.replit.app/              |
| Pitch Video       | https://youtu.be/hwLfr3Qfbtw                |
| Slide Deck        | https://canva.link/tul926g30xraccj          |

## Overview

### Problem

Artificial intelligence is changing the skills required across the workforce. Graduates and working adults may find it difficult to understand emerging job opportunities, identify their skill gaps, and choose suitable training resources. Without accessible and practical career guidance, preparing for future employment can become challenging.

### Solution

FutureNow is an AI-powered career exploration and reskilling platform designed for the Malaysian job market. It helps users assess their current skills, explore potential future roles, understand skill gaps, and discover learning pathways. By bringing career exploration and reskilling guidance together, FutureNow helps users make more informed decisions about their professional development.

## Key Features

1. **Skills Profile & Assessment**  
   Users can enter their current information, identify their skills, select proficiency levels, and provide relevant experience.

2. **Future Role Matching**  
   Helps users explore potential career roles based on their current skills and understand areas that may require further development.

3. **Reskilling Pathway**  
   Provides guidance for developing relevant skills and exploring suitable learning resources.

4. **AI & Market Intelligence**  
   Presents career and labour-market insights to support informed career planning.

5. **Scenario Planning**  
   Helps users consider different possible levels of AI-driven workplace change.

6. **Multilingual Interface**  
   Supports English, Bahasa Melayu, and Simplified Chinese to make career guidance more accessible.

## Technology Stack

The technologies below must be updated to match the actual implementation.

| Layer                   | Technology                               |
|-------------------------|------------------------------------------|
| Frontend                | TypeScript，Vite                         |
| Backend                 | Node.js, Express.js      |
| Database                | JSON job records (artifacts/api-server/data/jobs.json); PostgreSQL integration to be verified                                                             |
| AI | Structured skill data and explainable career-matching logic   |
| Development Environment | Replit                                   |
| Hosting                 | Replit                                   |

## Project Structure

The following is the intended repository structure. Update it to match the actual files committed to GitHub.

## Project Structure

FutureNow/
├── artifacts/
│   ├── api-server/       # Backend API server
│   └── future-now/       # FutureNow application
├── attached_assets/      # Supporting datasets and project assets
├── docs/                 # Project documentation and audit reports
├── generated-artifacts/  # Generated interface previews
├── lib/                  # Shared libraries and utilities
├── scripts/              # Development and data-processing scripts
├── src/                  # Source code and supporting scripts
├── submission/           # Official submission documents and proof of use
├── .gitignore
├── .replit               # Replit configuration
├── package.json          # Project scripts and dependencies
├── pnpm-lock.yaml        # Dependency lockfile
├── pnpm-workspace.yaml   # Workspace configuration
├── README.md             # Project documentation
└── LICENSE               # Apache License 2.0

## Architecture

FutureNow provides a user-facing career planning interface that connects skills assessment, career exploration, reskilling guidance, market intelligence, and scenario planning.

The exact AI services, data sources, and application components depend on the implementation documented in the source code.

## How to Run

### Option 1: Run on Replit

1. Open the FutureNow Replit project.
2. Review the project configuration and required dependencies.
3. Configure any required environment variables using Replit Secrets.
4. Click **Run** and follow the project's configured startup process.
5. Open the deployed application using the public Live Demo URL.

### Option 2: Run Locally

1. Clone the repository:

   git clone https://github.com/kaiqi1004-star/FutureNow


2. Install dependencies: pnpm install

Start the Frontend

Open a terminal at the repository root and run:

pnpm --filter @workspace/futureready-my dev

Start the Backend API Server

Open a second terminal at the repository root and run:

pnpm --filter @workspace/api-server dev


## How We Use Replit

Replit was used as the development environment for FutureNow.

The project was developed and tested in Replit, and the application is intended to be accessible through its live prototype deployment.

The final submission should document the actual Replit workflow, deployment status, and required proof of use.

**Proof of use:** submission/SDC2026_KQ BuildLab_Replit_POU.pdf

## Challenges & Learnings

- Translating career and labour-market information into understandable career guidance.
- Designing a user-friendly interface for different user backgrounds.
- Presenting career matching and reskilling recommendations in a clear and accessible way.
- Considering how AI-driven job changes may affect future skill requirements.


## Future Improvements

- Expand verified Malaysian labour-market data coverage.
- Improve career matching and explainability using validated data and evaluation.
- Provide more personalised reskilling recommendations.
- Improve accessibility and multilingual support.
- Update career insights as new information becomes available.

## Team

| Name | Role | GitHub |
|---|---|---|
| Lai Kai Qi| Team Leader | kaiqi1004-star |

## Submission Checklist

- [/ ] Team name, domain, and SDG track confirmed.
- [/ ] GitHub repository is public.
- [/ ] Live Demo URL is publicly accessible.
- [/ ] Pitch Video URL is accessible to reviewers.
- [/ ] Slide Deck URL added, if required.
- [/ ] Required submission documents are stored in `submission/`.
- [/ ] Replit proof of use is included.
- [ ] RunPod proof of use is included if RunPod was used and the rules require it.
- [/ ] Project structure and run instructions have been verified.
- [/ ] No API keys, passwords, or secrets are committed.

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
