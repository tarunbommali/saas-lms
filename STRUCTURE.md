# Frontend Project Structure

This project follows a modern, scalable React folder structure designed for separation of concerns and maintainability.

## Directory Layout

```
src/
├── components/          # React Components
│   ├── common/          # Shared atomic components (Inputs, Buttons, Cards)
│   │   └── ui/          # (Legacy/Shadcn-like) Base UI elements
│   ├── layout/          # Layout components (Header, Footer, Sidebar, Wrappers)
│   ├── features/        # Feature-specific modules (Domain Logic)
│   │   ├── admin/       # Admin dashboard and management
│   │   ├── auth/        # Authentication forms and guards
│   │   ├── course/      # Course catalog, cards, and details
│   │   ├── landing/     # Landing page sections
│   │   ├── profile/     # User profile and settings
│   │   └── ...
│   └── shared/          # Reusable widgets (Chat, specific complex molecules)
├── pages/               # Page components (Route targets)
├── hooks/               # Custom React Hooks
├── contexts/            # Global State Contexts
├── utils/               # Helper functions
└── ...
```

## Guidelines

1.  **Layout Components**: Place components that define the page frame (Nav, Footer) in `src/components/layout`.
2.  **Feature Components**: Group components by their business domain in `src/components/features`.
    *   Example: `CourseCard` goes in `src/components/features/Course/`.
3.  **Common/UI Components**: Generic, reusable UI elements (Buttons, Inputs) go in `src/components/ui` (or `common`). These should NOT contain business logic.
4.  **Pages**: Page components in `src/pages` should primarily compose generic layouts and specific features.

## Recent Changes (Refactor)

- Moved `Header`, `Footer`, `MobileNavigationDrawer` to `src/components/layout/`.
- Grouped domain folders (`Admin`, `Course`, `Auth`, etc.) into `src/components/features/`.
- Moved global widgets to `src/components/shared/`.
- Updated `vite.config.js` and critical imports.

**Note**: If you encounter "Module not found" errors, check relative imports (`../`) in feature files, as component depth has shifted.
