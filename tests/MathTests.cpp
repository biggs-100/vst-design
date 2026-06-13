/*
  ==============================================================================

   MathTests.cpp
   Created: 12 Jun 2026

   Tests for frame-index calculation and VU meter ballistics.

   Frame index logic matches FilmStripLookAndFeel::drawRotarySlider():
       frameIndex = jlimit(0, numFrames - 1,
           (int)std::floor(sliderPos * (numFrames - 1) + 0.5f));

   Ballistics logic matches VUMeterComponent::updateBallistics():
       force = spring * (newTarget - currentLevel) - damping * velocity;
       velocity += force / mass * dt;
       currentLevel += velocity * dt;

   These are pure math functions with no JUCE component dependency,
   making them ideal for standalone unit testing.

   ==============================================================================
*/

#include <cmath>
#include <cassert>
#include <iostream>
#include <algorithm>

//==============================================================================
// Frame index calculation — mirrors FilmStripLookAndFeel
static int valueToFrame (float sliderPos, int numFrames)
{
    if (numFrames <= 0)
        return 0;

    return std::max (0, std::min (numFrames - 1,
        static_cast<int> (std::floor (sliderPos * (numFrames - 1) + 0.5f))));
}

//==============================================================================
// Ballistics simulation — mirrors VUMeterComponent::updateBallistics
static void updateBallistics (double& currentLevel,
                              double& velocity,
                              double newTarget,
                              double mass,
                              double damping,
                              double spring,
                              double dt)
{
    double force = spring * (newTarget - currentLevel) - damping * velocity;
    velocity += force / mass * dt;
    currentLevel += velocity * dt;

    // Clamp to valid range (allow slight overshoot for underdamped response).
    currentLevel = std::max (-0.1, std::min (1.1, currentLevel));
}

//==============================================================================
void testValueToFrame()
{
    // ── Boundaries at 0.0 and 1.0 ──────────────────────────────────────
    assert (valueToFrame (0.0f, 100) == 0);
    assert (valueToFrame (1.0f, 100) == 99);

    // ── Midpoint ───────────────────────────────────────────────────────
    // With 100 frames, sliderPos 0.5 → frameIndex = floor(0.5 * 99 + 0.5)
    // = floor(49.5 + 0.5) = floor(50.0) = 50
    assert (valueToFrame (0.5f, 100) == 50);

    // ── Single frame ───────────────────────────────────────────────────
    assert (valueToFrame (0.0f, 1) == 0);
    assert (valueToFrame (0.5f, 1) == 0);
    assert (valueToFrame (1.0f, 1) == 0);

    // ── Clamping below 0.0 ─────────────────────────────────────────────
    assert (valueToFrame (-0.1f, 100) == 0);

    // ── Clamping above 1.0 ─────────────────────────────────────────────
    assert (valueToFrame (1.5f, 100) == 99);

    // ── Two-frame switch ───────────────────────────────────────────────
    assert (valueToFrame (0.0f, 2) == 0);
    // floor(0.49 * 1 + 0.5) = floor(0.99) = 0
    assert (valueToFrame (0.49f, 2) == 0);
    // floor(0.5 * 1 + 0.5) = floor(1.0) = 1
    assert (valueToFrame (0.5f, 2) == 1);
    assert (valueToFrame (1.0f, 2) == 1);

    // ── Zero / invalid frame count ─────────────────────────────────────
    assert (valueToFrame (0.5f, 0) == 0);
    assert (valueToFrame (0.5f, -1) == 0);

    std::cout << "  \xE2\x9C\x93  Math: valueToFrame boundaries and midpoints\n";
}

//==============================================================================
void testBallisticsDefault()
{
    // Default VU meter ballistics: mass=1.0, damping=0.7, spring=0.8
    //
    // The system is a second-order damped harmonic oscillator.
    // With spring=0.8, damping=0.7 → underdamped (zeta ≈ 0.39).
    // After 600 frames (10 seconds) the response should have settled
    // close to the target (settling time ≈ 4 / (zeta * omega_n) ≈ 11.5 s).

    double mass        = 1.0;
    double damping     = 0.7;
    double spring      = 0.8;
    double dt          = 1.0 / 60.0;   // 60 FPS

    double currentLevel = 0.0;
    double velocity     = 0.0;
    double targetLevel  = 1.0;

    // Simulate 600 frames (10 seconds at 60 FPS).
    for (int i = 0; i < 600; ++i)
        updateBallistics (currentLevel, velocity, targetLevel,
                          mass, damping, spring, dt);

    // Should have converged close to target by now.
    assert (std::abs (currentLevel - targetLevel) < 0.05);

    std::cout << "  \xE2\x9C\x93  Math: default ballistics converges to target\n";
}

//==============================================================================
void testBallisticsOverDamped()
{
    // Over-damped system: damping > 2 * sqrt(m * k)
    //
    // With mass=1.0, spring=0.8, the critical damping value is:
    //   c_crit = 2 * sqrt(m * k) = 2 * sqrt(0.8) ≈ 1.789
    // Using damping=2.5 ensures over-damped response (zeta ≈ 1.40).
    //
    // An over-damped system should never overshoot the target.

    double mass        = 1.0;
    double damping     = 2.5;   // over-damped
    double spring      = 0.8;
    double dt          = 1.0 / 60.0;

    double currentLevel = 0.0;
    double velocity     = 0.0;
    double targetLevel  = 1.0;

    double maxLevel = 0.0;

    // Simulate 600 frames (10 seconds).
    for (int i = 0; i < 600; ++i)
    {
        updateBallistics (currentLevel, velocity, targetLevel,
                          mass, damping, spring, dt);
        maxLevel = std::max (maxLevel, currentLevel);
    }

    // Over-damped: should never exceed target.
    assert (maxLevel <= targetLevel + 0.001);

    std::cout << "  \xE2\x9C\x93  Math: over-damped ballistics doesn't overshoot\n";
}

//==============================================================================
void testBallisticsUnderDamped()
{
    // Under-damped system: damping < 2 * sqrt(m * k)
    //
    // With mass=1.0, spring=0.8, damping=0.2 → zeta ≈ 0.11
    // An under-damped system SHOULD overshoot the target before settling.

    double mass        = 1.0;
    double damping     = 0.2;   // under-damped
    double spring      = 0.8;
    double dt          = 1.0 / 60.0;

    double currentLevel = 0.0;
    double velocity     = 0.0;
    double targetLevel  = 1.0;

    double maxLevelAfterFirstPeak = 0.0;
    double previousLevel = 0.0;
    bool hasCrossedMidpoint = false;

    // Simulate 300 frames (5 seconds). Look for overshoot beyond 1.0.
    for (int i = 0; i < 300; ++i)
    {
        previousLevel = currentLevel;

        updateBallistics (currentLevel, velocity, targetLevel,
                          mass, damping, spring, dt);

        // Track whether we've passed the midpoint (0.5) — ensures we're
        // past the initial rise before checking for overshoot.
        if (currentLevel >= 0.5)
            hasCrossedMidpoint = true;

        if (hasCrossedMidpoint)
            maxLevelAfterFirstPeak = std::max (maxLevelAfterFirstPeak, currentLevel);
    }

    // Under-damped: should overshoot above target.
    // (The clamp allows up to 1.1, so the math should push past 1.0.)
    assert (maxLevelAfterFirstPeak > 1.0);

    std::cout << "  \xE2\x9C\x93  Math: under-damped ballistics overshoots target\n";
}

//==============================================================================
void testBallisticsDampingClamp()
{
    // VUMeterComponent clamps damping to a minimum of 0.001 in its
    // constructor to prevent numerical instability. This test verifies
    // that the ballistics math remains stable even at the minimum.
    //
    // Even with very low damping, the velocity integration must not
    // produce NaN or infinite values, and the system must still converge
    // toward the target (though it may oscillate).

    double mass        = 1.0;
    double damping     = 0.001;  // minimum positive (clamped value)
    double spring      = 0.8;
    double dt          = 1.0 / 60.0;

    double currentLevel = 0.0;
    double velocity     = 0.0;
    double targetLevel  = 1.0;

    // Track whether any NaN or inf values appear.
    bool hasNaN = false;
    bool hasInf = false;

    // Simulate 600 frames (10 seconds).
    for (int i = 0; i < 600; ++i)
    {
        updateBallistics (currentLevel, velocity, targetLevel,
                          mass, damping, spring, dt);

        if (std::isnan (currentLevel) || std::isnan (velocity))
            hasNaN = true;
        if (std::isinf (currentLevel) || std::isinf (velocity))
            hasInf = true;
    }

    // Numerical stability check.
    assert (! hasNaN);
    assert (! hasInf);

    // Even with minimal damping, the system should be near the target
    // after 10 seconds (it will oscillate around it).
    assert (std::abs (currentLevel - targetLevel) < 0.2);

    std::cout << "  \xE2\x9C\x93  Math: ballistics stable at minimum damping (0.001)\n";
}
