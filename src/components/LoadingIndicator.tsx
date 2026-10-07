import './Holocron.css';

export default function LoadingIndicator() {
  return (
    <div className="loading-indicator" aria-label="Loading response">
      <div className="radar" aria-hidden="true">
        <span className="radar__sweep" />
        <span className="radar__blip" />
        <span className="radar__blip" />
        <span className="radar__blip" />
      </div>
      <div className="loading-indicator__label">The databanks are searching</div>
    </div>
  );
}
