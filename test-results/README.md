# Load Test Results

This directory contains saved load test results in JSON format.

## Files

- `latest.json` - Most recent test results
- `test-*.json` - Historical test results with timestamps

## Viewing Results

```bash
# View latest test
npm run load-test -- --view

# View all tests
npm run load-test -- --view all

# Compare recent tests
npm run load-test -- --compare
```

## Result Format

Each JSON file contains:
- Connection metrics (success rate, connection time)
- Message metrics (sent, received, rate)
- Latency metrics (avg, P95, P99)
- Error details
- Test configuration

See [TEST_RESULTS.md](../TEST_RESULTS.md) for analysis and recommendations.
