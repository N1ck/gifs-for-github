// We need loadingIndicator for the search results
export default (
  <details class="ActionBar-item details-reset details-overlay toolbar-item select-menu select-menu-modal-right ghg-trigger">
    <summary
      class="menu-target Button Button--iconOnly Button--invisible Button--medium"
      aria-label="Insert a GIF"
      aria-haspopup="menu"
    >
      GIF
    </summary>
    <details-menu
      class="select-menu-modal position-absolute right-0 ghg-modal"
      style={{
        zIndex: 99,
        width: '480px',
        maxHeight: '410px',
      }}
      role="menu"
    >
      <div class="select-menu-header d-flex">
        <span class="select-menu-title flex-auto">Select a GIF</span>
        <span class="ghg-powered-by-giphy" />
      </div>
      <tab-list>
        <div class="select-menu-filters">
          <div class="select-menu-text-filter">
            <input
              type="text"
              class="form-control ghg-search-input"
              placeholder="Search for a GIF…"
              aria-label="Search for a GIF"
              autofocus=""
            />
          </div>
          <div
            class="ghg-giphy-results"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </div>
      </tab-list>
    </details-menu>
  </details>
);
