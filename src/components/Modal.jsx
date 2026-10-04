import Icon from './layout/Icon';

// Thin wrapper over the .modal-scrim / .modal classes already in
// global.css. Clicking the dark backdrop closes it, like the prototype.
export default function Modal({ title, onClose, children, footer, maxWidth }) {
  return (
    <div className="modal-scrim open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={maxWidth ? { maxWidth } : undefined}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={14} strokeWidth={2} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
