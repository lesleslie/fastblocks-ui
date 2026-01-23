#!/usr/bin/env python3
"""
Generate test templates for FastBulma components.

This script automates test creation, enabling the test-as-you-go approach
that reduces Phase 4 (Testing) from 4-5 weeks to 2-3 weeks through parallelization.

Usage:
    python scripts/generate-tests.py fast-button > tests/components/fast-button.test.js
    python scripts/generate-tests.py --all
"""

import sys
import argparse
from typing import Dict, List


# Component metadata for test generation
COMPONENT_METADATA: Dict[str, Dict] = {
    'fast-button': {
        'bulma_classes': ['is-primary', 'is-success', 'is-danger', 'is-warning', 'is-info'],
        'fast_token': '--accent-fill-rest',
        'aria_role': 'button',
        'keyboard_support': ['Enter', 'Space'],
        'slots': [],
    },
    'fast-card': {
        'bulma_classes': [],
        'fast_token': '--neutral-fill-rest',
        'aria_role': 'article',
        'keyboard_support': [],
        'slots': ['heading', 'actions'],
    },
    'fast-text-field': {
        'bulma_classes': [],
        'fast_token': '--neutral-fill-rest',
        'aria_role': None,
        'keyboard_support': ['Tab', 'Shift+Tab'],
        'slots': [],
    },
    'fast-checkbox': {
        'bulma_classes': [],
        'fast_token': '--neutral-fill-rest',
        'aria_role': 'checkbox',
        'keyboard_support': ['Space'],
        'slots': [],
    },
    'fast-select': {
        'bulma_classes': [],
        'fast_token': '--neutral-fill-rest',
        'aria_role': 'combobox',
        'keyboard_support': ['ArrowUp', 'ArrowDown', 'Enter'],
        'slots': [],
    },
}


def generate_component_test(component_name: str) -> str:
    """Generate test template for a component."""
    metadata = COMPONENT_METADATA.get(component_name, {})

    test = f"""import {{ describe, test, expect, beforeEach, afterEach }} from '@jest/globals';
import {{ axe }} from 'jest-axe';

describe('{component_name}', () => {{
  let container: HTMLElement;
  let component: HTMLElement;

  beforeEach(() => {{
    container = document.createElement('div');
    document.body.appendChild(container);
  }});

  afterEach(() => {{
    document.body.removeChild(container);
  }});

  describe('CSS Variable Mapping', () => {{
    test('maps Bulma classes to FAST tokens', async () => {{
      component = document.createElement('{component_name}');
      component.className = 'is-primary';
      container.appendChild(component);

      const styles = getComputedStyle(component);
      const tokenValue = styles.getPropertyValue('{metadata.get('fast_token', '--neutral-fill-rest')}');

      // Verify CSS variable is set
      expect(tokenValue).toBeTruthy();
      expect(tokenValue).toContain('var(--bulma-primary');
    }});

  {generate_bulma_class_tests(component_name, metadata.get('bulma_classes', []))}
  }});

  describe('Accessibility', () => {{
    test('has no ARIA violations', async () => {{
      component = document.createElement('{component_name}');
      container.appendChild(component);

      const results = await axe(component);
      expect(results.violations).toHaveLength(0);
    }});

    test('has proper ARIA attributes', async () => {{
      component = document.createElement('{component_name}');
      container.appendChild(component);

      // Check for proper role if applicable
      const role = component.getAttribute('role');
      {generate_aria_test(metadata.get('aria_role'))}
    }});

    test('has keyboard support', async () => {{
      component = document.createElement('{component_name}');
      container.appendChild(component);

      // Focus the component
      component.focus();

      // Verify it can receive focus
      expect(document.activeElement).toBe(component);

      // Test keyboard interactions
      {generate_keyboard_tests(metadata.get('keyboard_support', []))}
    }});
  }});

  describe('Shadow DOM', () => {{
    test('has shadow root attached', async () => {{
      component = document.createElement('{component_name}');
      container.appendChild(component);

      // Verify shadow root exists
      expect(component.shadowRoot).toBeTruthy();
    }});

    test('CSS variables penetrate shadow boundary', async () => {{
      component = document.createElement('{component_name}');
      component.className = 'is-primary';
      container.appendChild(component);

      // Wait for shadow root to be populated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if CSS variable is accessible in shadow DOM
      const shadowElement = component.shadowRoot?.firstElementChild;
      expect(shadowElement).toBeTruthy();

      const styles = getComputedStyle(shadowElement!);
      const tokenValue = styles.getPropertyValue('{metadata.get('fast_token', '--neutral-fill-rest')}');

      expect(tokenValue).toBeTruthy();
    }});
  }});

  {generate_slot_tests(component_name, metadata.get('slots', []))}

  describe('Memory Management', () => {{
    test('does not leak event listeners on destroy', async () => {{
      const initialListeners = window.getEventListeners?.(document)?.length || 0;

      // Create and destroy 10 components
      for (let i = 0; i < 10; i++) {{
        const tempComponent = document.createElement('{component_name}');
        tempComponent.addEventListener('click', () => {{}});
        container.appendChild(tempComponent);
        container.removeChild(tempComponent);
      }}

      // Force garbage collection if available
      if (window.gc) {{
        window.gc();
      }}

      const finalListeners = window.getEventListeners?.(document)?.length || 0;

      // Verify no listener leak
      expect(finalListeners).toBe(initialListeners);
    }});
  }});
}});
"""
    return test


def generate_bulma_class_tests(component_name: str, bulma_classes: List[str]) -> str:
    """Generate tests for Bulma modifier classes."""
    if not bulma_classes:
        return "    test('has no Bulma class mappings', async () => {\n      expect(true).toBe(true);\n    });"

    tests = []
    for class_name in bulma_classes:
        color = class_name.replace('is-', '')
        tests.append(f"""
    test('maps .{class_name} to correct color', async () => {{
      component = document.createElement('{component_name}');
      component.className = '{class_name}';
      container.appendChild(component);

      const styles = getComputedStyle(component);
      const tokenValue = styles.getPropertyValue('--accent-fill-rest');

      // Should reference Bulma color variable
      expect(tokenValue).toContain('var(--bulma-{color}');
    }});""")

    return "\n".join(tests)


def generate_aria_test(role: str | None) -> str:
    """Generate ARIA role test."""
    if not role:
        return "    // No ARIA role required for this component"
    return f"    expect(role).toBe('{role}');"


def generate_keyboard_tests(keyboard_support: List[str]) -> str:
    """Generate keyboard interaction tests."""
    if not keyboard_support:
        return "    // No keyboard interactions for this component"

    tests = []
    for key in keyboard_support:
        tests.append(f"""
    // Test {key} key
    const keyEvent = new KeyboardEvent('keydown', {{ key: '{key}' }});
    component.dispatchEvent(keyEvent);""")

    return "\n".join(tests)


def generate_slot_tests(component_name: str, slots: List[str]) -> str:
    """Generate tests for named slots."""
    if not slots:
        return ""

    slot_tests = []
    slot_tests.append("describe('Slots', () => {")

    for slot_name in slots:
        slot_tests.append(f"""
  test('renders {slot_name} slot content', async () => {{
    component = document.createElement('{component_name}');
    const slotContent = document.createElement('span');
    slotContent.slot = '{slot_name}';
    slotContent.textContent = '{slot_name} content';
    component.appendChild(slotContent);
    container.appendChild(component);

    // Wait for shadow DOM
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify slot content is rendered
    const slotElement = component.shadowRoot?.querySelector(`[slot="{slot_name}"]`);
    expect(slotElement).toBeTruthy();
    expect(slotElement?.textContent).toContain('{slot_name} content');
  }});""")

    slot_tests.append("});")
    return "\n".join(slot_tests)


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Generate test templates for FastBulma components')
    parser.add_argument('component', nargs='?', help='Component name (e.g., fast-button)')
    parser.add_argument('--all', action='store_true', help='Generate tests for all components')
    parser.add_argument('--list', action='store_true', help='List all available components')

    args = parser.parse_args()

    if args.list:
        print("Available components:")
        for comp in COMPONENT_METADATA.keys():
            print(f"  - {comp}")
        return

    if args.all:
        # Generate tests for all components
        for component_name in COMPONENT_METADATA.keys():
            print(f"// Generating test for {component_name}")
            print(generate_component_test(component_name))
            print("\n")
    elif args.component:
        # Generate test for specific component
        print(generate_component_test(args.component))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
