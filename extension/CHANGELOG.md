# Changelog

All notable changes to the Preflight Status extension will be documented in this file.

## [1.0.1] - 2026-01-07

### Fixed
- **Extension activation timing issue** - Fixed race condition that caused extension to fail during early initialization
  - Added 1.5 second delay to ensure VS Code UI is fully ready before running initial checks
  - Added workspace readiness verification before attempting to run checks
  - Improved error handling to prevent crashes during activation
  - Added loading state to tree views during initialization
  - Removed intrusive activation notification message
  
### Changed
- Improved logging for better debugging of initialization sequence
- Reduced notification spam during startup
- Better error messages for missing workspace scenarios

## [1.0.0] - 2026-01-06

### Added
- Initial release of Preflight Status extension
- Real-time API health and environment status monitoring
- Tree view for environment checks and service connections
- Status bar integration
- Auto-refresh functionality
- Dashboard integration
- Environment file navigation
- Service logo support
