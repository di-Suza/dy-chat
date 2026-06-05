import { Component } from "react";

export class ErrorBoundary extends Component {
  state = {
    hasError: false
  };

  static getDerivedStateFromError() {
    return {
      hasError: true
    };
  }

  componentDidCatch(error, info) {
    console.error("Frontend error boundary caught an error", error, info);
  }

  handleRetry = () => {
    this.setState({
      hasError: false
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-page">
          <section className="app-error-panel">
            <h1>Something went wrong</h1>
            <p>The app hit an unexpected UI error. Try again without losing your session.</p>
            <button type="button" onClick={this.handleRetry}>
              Try again
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

