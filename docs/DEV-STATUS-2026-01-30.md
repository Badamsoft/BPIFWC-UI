# DEV STATUS (2026-01-30)

## Project
- Plugin: BadamSoft Product Importer for WooCommerce
- Workspace path: /Applications/MAMP/htdocs/wp-content/plugins/badamsoft-product-importer-for-woocommerce

## Current focus / stage
- Ongoing work around WordPress.org / WP review readiness and general hardening.
- Active development area: admin React UI (import wizard + field mapping) and REST API integration.

## Rename stage (where it started)
### Primary rename entry points
- badamsoft-product-importer-for-woocommerce.php
  - Plugin header includes: "Plugin Name: BadamSoft Product Importer for WooCommerce"
  - Text Domain: badamsoft-product-importer-for-woocommerce
- readme.txt
  - Title: "=== BadamSoft Product Importer for WooCommerce ==="
- src/Admin/AdminPage.php
  - Admin menu slug/page: badamsoft-product-importer-for-woocommerce
  - Menu title strings use textdomain: badamsoft-product-importer-for-woocommerce
  - Localized JS data includes pluginName and adminUrl with the same slug

## Main entry points / architecture
### PHP
- badamsoft-product-importer-for-woocommerce.php
  - Defines constants (PIFWC_VERSION, PIFWC_PLUGIN_DIR, etc.)
  - Loads src/autoload.php (PSR-4)
  - Loads includes/bootstrap.php
- src/Core/Plugin.php
  - Boots repositories and services
  - Registers admin menu and assets
  - Registers REST controllers:
    - UploadController
    - MappingController
    - ImportController
    - ProfilesController
    - SettingsController
    - RestApi (health)
- src/Api/RestApi.php
  - GET /wp-json/pifwc/v1/health
  - Adds aggressive no-cache headers for shared hosting/CDN caching issues

### Admin UI (React)
- ui-src/components/ImportDashboard.tsx
  - Loads:
    - GET /wp-json/pifwc/v1/profiles?limit=1000
    - GET /wp-json/pifwc/v1/import/jobs?limit=50
- ui-src/components/NewImport.tsx
  - Import wizard with steps:
    - Data Source
    - Format + Preview
    - Field Mapping
    - Update Logic
    - Launch
  - Template profile apply/undo logic exists here (applyTemplateProfile / undoTemplateApply)
- ui-src/components/FieldMapping.tsx
  - Drag & drop mapping, manual values/templates, attributes/categories, product type tabs
  - Template profile selector loads profiles from /profiles?limit=100

## What already exists (high-level)
- Admin menu + React mount point in WP admin.
- REST API namespace pifwc/v1 and several controllers wired in Plugin.php.
- Import Dashboard UI loads recent jobs and profiles.
- New Import wizard implements upload/preview/mapping UI flow.
- Free vs Pro gating exists in UI via window.pifwcAdmin.isPro.

## Known incomplete / risky areas observed in code
### FieldMapping.tsx
- Required fields logic exists (missingRequiredTargetFields / requiredFieldsMapped) but Next does not enforce it:
  - handleNext() contains an empty block for the "not mapped" case.
- Possible mismatch in mapping token normalization:
  - Drag-drop stores sourceFieldId like {ColumnName}
  - Some lookups compare normalized field name against the token string without stripping {}.

### "WP review status" documentation
- No docs/ folder existed in the repo at the time this snapshot was created.
- Searches for strings like "plugin review", "review team", "WP review", "wordpress.org" did not find a dedicated checklist/status document in this repo.
- This file is created to capture the current stage snapshot.

## Next suggested steps
- Enforce required mapping validation in FieldMapping "Next".
- Normalize mapping token handling consistently (strip {} where appropriate).
- Confirm API contract consistency between UI (profiles/mapping) and REST controllers.
- Create/maintain a dedicated WP review checklist document under docs/ (separate from this snapshot).
