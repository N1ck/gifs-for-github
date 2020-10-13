import 'webext-dynamic-content-scripts'
import addDomainPermissionToggle from 'webext-domain-permission-toggle'

// Allow the extension to be run on custom domains e.g. GitHub enterprise
addDomainPermissionToggle()
