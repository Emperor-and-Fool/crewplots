# Pages Directory - Migration Status & Module Structure Guide

## 📁 Current Pages Directory Contents

This directory now contains only **non-migrated legacy pages** and **standalone pages** that don't belong to specific modules.

### Active Pages (Still in /pages/)
- `landing.tsx` - Marketing landing page (standalone)
- `not-found.tsx` - 404 error page (global utility)

### Legacy Pages (Moved to backup/)
All other pages have been **migrated to modules** following the modular architecture pattern. Original files are preserved in `backup/client/src/pages/` with `.bak` extensions.

## 🏗️ Modular Architecture - Where to Find Pages

### 📊 Dashboard Module (`/modules/dashboard/`)
```
└── pages/
    ├── Dashboard.tsx        # Main dashboard (/)
    └── Reports.tsx          # Reports page (/reports)
```

### 👥 Users Module (`/modules/users/`)
```
└── pages/
    ├── Applicants.tsx           # Applicant list (/applicants)
    ├── ApplicantDetail.tsx      # Individual applicant (/applicant/:id)
    ├── ApplicantPortal.tsx      # Applicant portal (/applicant-portal)
    ├── CrewManagement.tsx       # Crew management (/crew-management)
    ├── CrewMemberProfile.tsx    # Crew member profiles (/crew/:id)
    ├── Profile.tsx              # User profile (/profile)
    ├── ProfileEdit.tsx          # Profile editing (/profile/edit)
    ├── RegistrationSuccess.tsx  # Registration success (/registration-success)
    └── UserSettings.tsx         # User settings (/user-settings)
```

### 🔐 Auth Module (`/modules/auth/`)
```
└── pages/
    ├── LoginPage.tsx            # Login (/login)
    └── RegistrationPage.tsx     # Registration (/register)
```

### 📅 Scheduler Module (`/modules/scheduler/`)
```
└── pages/
    ├── SchedulerListPage.tsx    # Schedule templates (/scheduler)
    ├── SchedulerEditPage.tsx    # Schedule editing (/scheduler/edit/:id)
    ├── SchedulerCreatePage.tsx  # Schedule creation (/shift-creation)
    └── ViewCalendar.tsx         # Calendar view (/view-calendar)
```

### 📍 Locations Module (`/modules/locations/`)
```
└── pages/
    ├── LocationsPage.tsx        # Locations list (/locations)
    ├── LocationDetailPage.tsx   # Location details (/locations/:id)
    └── LocationCreatePage.tsx   # Location creation (/locations/create)
```

### ⚙️ Administration Module (`/modules/administration/`)
```
└── pages/
    ├── Settings.tsx                   # Main settings hub (/settings)
    ├── EmailSettings.tsx              # Email config (/settings/email)
    ├── SecuritySettings.tsx           # Security config (/settings/security)
    ├── MessagingValidationTest.tsx    # Messaging tests (/messaging-validation-test)
    ├── ValidationEngine3Test.tsx      # VE3 tests (/validation-engine-3-test)
    ├── admin-test.tsx                 # Admin tests (/admin-test)
    ├── endpoint-test.tsx              # API tests (/endpoint-test)
    └── validation-test.tsx            # Validation tests (/validation-test)
```

### 💰 Cash Management Module (`/modules/cashcount/`)
```
└── pages/
    └── CashManagement.tsx       # Cash management (/cash-management)
```

### 📚 Knowledge Base Module (`/modules/knowledge-base/`)
```
└── pages/
    └── KnowledgeBase.tsx        # Knowledge base (/knowledge-base)
```

### 🎯 Competencies Module (`/modules/competencies/`)
```
└── pages/
    └── (TODO: Future implementation)
```

## 📋 Module Structure Pattern

Each module follows this standardized structure:

```
/modules/{module-name}/
├── components/          # Module-specific components
├── hooks/              # Module-specific React hooks
├── pages/              # Module pages (main content)
│   └── index.ts        # Page exports
├── types/              # Module-specific TypeScript types
└── index.ts            # Main module exports
```

## 🔄 Migration History

### Completed Migrations
- ✅ **July 12, 2025:** Dashboard module (dashboard.tsx, reports.tsx)
- ✅ **July 12, 2025:** Users module (applicants.tsx, applicant-detail.tsx, registration-success.tsx)
- ✅ **July 12, 2025:** Administration module (settings.tsx)
- ✅ **July 12, 2025:** Scheduler module (view-calendar.tsx)
- ✅ **Earlier:** Auth, locations, cash management, knowledge base modules

### Architecture Benefits
1. **Modular Organization:** Related functionality grouped together
2. **Clean Imports:** `import { Page } from "@/modules/module-name"`
3. **Consistent Structure:** All modules follow same pattern
4. **Maintainability:** Easy to locate and modify related code
5. **Schema-First:** All modules use `@shared/schema` types

## 🔍 Finding Specific Pages

**Quick Reference:**
- **User Management:** `/modules/users/pages/`
- **Scheduling:** `/modules/scheduler/pages/`
- **System Settings:** `/modules/administration/pages/`
- **Authentication:** `/modules/auth/pages/`
- **Location Management:** `/modules/locations/pages/`

## 📝 Notes

- **Backup Preservation:** All original files saved in `backup/client/src/pages/`
- **Import Updates:** App.tsx uses module imports instead of direct page imports
- **Route Protection:** All routes maintain original role-based protection
- **Functionality Preserved:** Zero functionality loss during migration

---
*Last Updated: July 12, 2025 - Post Module Migration Completion*