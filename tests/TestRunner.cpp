/*
  ==============================================================================

   TestRunner.cpp
   Created: 12 Jun 2026

   Standalone test runner for PluginStudio Runtime module tests.

   Tests are grouped by concern — parser, components, and math/ballistics.
   Each group lives in its own .cpp file and declares a single test function.

   To build: include pluginstudio_runtime/ on the module path and link
   juce_core, juce_graphics, juce_gui_basics, juce_audio_processors,
   juce_audio_utils.

   ==============================================================================
*/

#include <pluginstudio_runtime/pluginstudio_runtime.h>
#include <iostream>
#include <cassert>
#include <cmath>

//==============================================================================
// Test function declarations — one per test group
void testParserBasic();
void testParserSchemaVersion();
void testParserEdgeCases();
void testComponentStruct();
void testComponentFactoryDispatch();
void testValueToFrame();
void testBallisticsDefault();
void testBallisticsOverDamped();
void testBallisticsUnderDamped();
void testBallisticsDampingClamp();

//==============================================================================
int main()
{
    std::cout << "╔══════════════════════════════════════════╗\n";
    std::cout << "║   PluginStudio Runtime — Test Suite      ║\n";
    std::cout << "╚══════════════════════════════════════════╝\n\n";

    // ── Phase 6.2: Parser Tests ────────────────────────────────────────
    std::cout << "── Parser Tests ──────────────────────────────\n";
    testParserBasic();
    testParserSchemaVersion();
    testParserEdgeCases();

    // ── Phase 6.3: Component Tests ────────────────────────────────────
    std::cout << "\n── Component Tests ───────────────────────────\n";
    testComponentStruct();
    testComponentFactoryDispatch();

    // ── Phase 6.4: Ballistics & Frame Calc Tests ──────────────────────
    std::cout << "\n── Math Tests ────────────────────────────────\n";
    testValueToFrame();
    testBallisticsDefault();
    testBallisticsOverDamped();
    testBallisticsUnderDamped();
    testBallisticsDampingClamp();

    std::cout << "\n╔══════════════════════════════════════════╗\n";
    std::cout << "║   All tests passed!                      ║\n";
    std::cout << "╚══════════════════════════════════════════╝\n";
    return 0;
}
