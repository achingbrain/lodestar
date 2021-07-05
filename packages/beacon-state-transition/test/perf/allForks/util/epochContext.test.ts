import {Epoch} from "@chainsafe/lodestar-types";
import {itBench, setBenchOpts} from "@dapplion/benchmark";
import {allForks, computeEpochAtSlot} from "../../../../src";
import {generatePerfTestCachedBeaconState, numValidators} from "../../util";

// Current implementation scales very well with number of requested validators
// Benchmark data from Wed Jun 30 2021 - Intel(R) Core(TM) i5-8250U CPU @ 1.60GHz
//
// ✓ getCommitteeAssignments - req 1 vs - 200000 vc                      225.6465 ops/s    4.431711 ms/op        -       1024 runs   4.54 s
// ✓ getCommitteeAssignments - req 100 vs - 200000 vc                    141.3410 ops/s    7.075087 ms/op        -       1024 runs   7.25 s
// ✓ getCommitteeAssignments - req 1000 vs - 200000 vc                   124.7096 ops/s    8.018632 ms/op        -       1024 runs   8.25 s
describe("epochCtx.getCommitteeAssignments", () => {
  let state: allForks.CachedBeaconState<allForks.BeaconState>;
  let epoch: Epoch;

  before(function () {
    this.timeout(60 * 1000);
    state = generatePerfTestCachedBeaconState() as allForks.CachedBeaconState<allForks.BeaconState>;
    epoch = computeEpochAtSlot(state.slot);

    // Sanity check to ensure numValidators doesn't go stale
    if (state.validators.length !== numValidators) throw Error("constant numValidators is wrong");
  });

  setBenchOpts({
    maxMs: 10 * 1000,
    minMs: 5 * 1000,
    runs: 1024,
  });

  // Only run for 1000 in CI to ensure performance does not degrade
  const reqCounts = process.env.CI ? [1000] : [1, 100, 1000];

  // the new way of getting attester duties
  for (const reqCount of reqCounts) {
    const validatorCount = numValidators;
    // Space out indexes
    const indexMult = Math.floor(validatorCount / reqCount);
    const indices = Array.from({length: reqCount}, (_, i) => i * indexMult);

    itBench(`getCommitteeAssignments - req ${reqCount} vs - ${validatorCount} vc`, () => {
      state.epochCtx.getCommitteeAssignments(epoch, indices);
    });
  }
});