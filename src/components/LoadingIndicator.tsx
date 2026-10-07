

export default function LoadingIndicator() {
  return (
    <div className="loading-indicator" aria-label="Loading response">
      <div className="loading-indicator__label">The databanks are searching</div>
      <div className="loading-indicator__dots" aria-hidden="true">
        <span className="loading-indicator__dot" />
        <span className="loading-indicator__dot" />
        <span className="loading-indicator__dot" />
      </div>
    </div>
  );
}
