import { Component } from 'react';

/** If something fails while drawing, show a way out instead of a blank screen. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Alle crashed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash" role="alert">
        <p className="crash__title">Something went wrong</p>
        <p className="crash__text">That screen couldn’t load. Your decks and progress are safe.</p>
        <button type="button" className="btn btn--primary" onClick={() => { this.setState({ error: null }); this.props.onReset?.(); }}>
          Back to my decks
        </button>
      </div>
    );
  }
}
