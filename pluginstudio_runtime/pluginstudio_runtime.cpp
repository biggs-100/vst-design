/*
  ==============================================================================

   pluginstudio_runtime.cpp — Single compile unit.

   JUCE modules conventionally include all internal .cpp files from a single
   compilation unit instead of building each one separately. This avoids
   duplicate-symbol errors when the module is linked into a consumer project.

   No .cpp in this module should have its own compilation unit.

  ==============================================================================
*/

#include "pluginstudio_runtime.h"

//==============================================================================
// Parser
#include "parser/DesignParser.cpp"

//==============================================================================
// Components
#include "components/DynamicComponent.cpp"
#include "components/KnobComponent.cpp"
#include "components/SwitchComponent.cpp"
#include "components/OutputComponents.cpp"

//==============================================================================
// LookAndFeel
#include "lookandfeel/FilmStripLookAndFeel.cpp"

//==============================================================================
// Binding
#include "binding/ParameterBinder.cpp"
