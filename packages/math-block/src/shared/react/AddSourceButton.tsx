// Shown in place of the preview when the math content has no source yet.
export const AddSourceButton = (props: { text: string }) => (
  <div className="bn-add-source-code-button" contentEditable={false}>
    <div className="bn-add-source-code-button-icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M24 12l-5.657 5.657-1.414-1.414L21.172 12l-4.243-4.243 1.414-1.414L24 12zM2.828 12l4.243 4.243-1.414 1.414L0 12l5.657-5.657 1.414 1.414L2.828 12z"></path>
      </svg>
    </div>
    <p className="bn-add-source-code-button-text">{props.text}</p>
  </div>
);
