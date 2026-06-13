import type { DesignComponent } from '@/types/component';

/**
 * Convert a component label/id to a camelCase variable name suitable for C++.
 */
export function toVariableName(comp: DesignComponent): string {
  const name = comp.label || comp.id;
  const clean = name.replace(/[^a-zA-Z0-9]+/g, ' ');
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length === 0) return 'component';
  return parts
    .map((word, i) =>
      i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join('');
}

/**
 * Generate the contents of a C++ header file (.h) with JUCE widget declarations.
 */
export function generateCppHeader(components: DesignComponent[], projectName: string): string {
  const lines: string[] = [];
  lines.push('// PluginStudio — Generated Header Declarations');
  lines.push(`// Project: ${projectName}`);
  lines.push('');

  for (const comp of components) {
    const varName = toVariableName(comp);
    const paramComment = comp.parameterId
      ? ` // parameter: ${comp.parameterId}`
      : '';

    lines.push(`// ${comp.type}: ${comp.label || comp.id}${paramComment}`);

    switch (comp.type) {
      case 'Knob':
        lines.push(`juce::Slider ${varName};`);
        lines.push(`juce::ImageComponent ${varName}Image;`);
        if (comp.parameterId) {
          lines.push(
            `std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> ${varName}Attachment;`,
          );
        }
        break;
      case 'Switch':
        lines.push(`juce::ImageButton ${varName};`);
        if (comp.states && comp.states.length > 0) {
          lines.push(`// States: ${comp.states.join(', ')}`);
        }
        if (comp.parameterId) {
          lines.push(
            `std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> ${varName}Attachment;`,
          );
        }
        break;
      case 'VUMeter':
        lines.push(`// VU Meter — no standard JUCE widget, use custom component`);
        lines.push(`juce::ImageComponent ${varName};`);
        break;
      case 'LED':
        lines.push(`// LED indicator — use custom paint or ImageComponent`);
        lines.push(`juce::ImageComponent ${varName};`);
        break;
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate the contents of a C++ source file (.cpp) with setBounds entries.
 */
export function generateCppSource(components: DesignComponent[]): string {
  const lines: string[] = [];
  lines.push('// PluginStudio generated setBounds — do not edit manually');
  lines.push('');

  for (const comp of components) {
    const varName = toVariableName(comp);
    lines.push(`// ${comp.label || comp.id}`);
    lines.push(`${varName}.setBounds(${Math.round(comp.x)}, ${Math.round(comp.y)}, ${Math.round(comp.width)}, ${Math.round(comp.height)});`);

    if (comp.type === 'Knob') {
      lines.push(`${varName}Image.setBounds(${Math.round(comp.x)}, ${Math.round(comp.y)}, ${Math.round(comp.width)}, ${Math.round(comp.height)});`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
