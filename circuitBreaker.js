class CircuitBreaker {
  constructor(maxConsecutiveErrors = 5) {
    this.maxConsecutiveErrors = maxConsecutiveErrors;
    this.errorCount = 0;
    this.tripped = false;
  }

  recordSuccess() {
    this.errorCount = 0;
  }

  recordError() {
    this.errorCount++;
    if (this.errorCount >= this.maxConsecutiveErrors) {
      this.tripped = true;
      console.error("Circuit breaker tripped due to consecutive errors.");
    }
  }

  isTripped() {
    return this.tripped;
  }

  reset() {
    this.errorCount = 0;
    this.tripped = false;
  }
}

module.exports = CircuitBreaker;
