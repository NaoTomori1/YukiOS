import {
  action,
  custom,
  note,
  segment,
  select,
  slider,
  subHeading,
  toggle,
} from "../win11Controls.js";
import { win11Description, win11Icon } from "../win11SettingsIcons.js";
import {
  WIN11_ANIMATION_SPEED_OPTIONS,
  WIN11_CLOSE_ANIMATION_OPTIONS,
  WIN11_FONT_FAMILY_OPTIONS,
  WIN11_MINIMIZE_ANIMATION_OPTIONS,
  WIN11_OPEN_ANIMATION_OPTIONS,
  WIN11_RESTORE_ANIMATION_OPTIONS,
  WIN11_UI_DENSITY_OPTIONS,
} from "../win11SettingsBindings.js";

export const accessibilityPage = {
  id: "Accessibility",
  label: "Accessibility",
  tiles: () => [
    {
      name: "Text size",
      desc: win11Description("Accessibility", "Text size"),
      icon: win11Icon("Accessibility", "Text size"),
      subPage: "a11y-textsize",
    },
    {
      name: "Visual effects",
      desc: win11Description("Accessibility", "Visual effects"),
      icon: win11Icon("Accessibility", "Visual effects"),
      subPage: "a11y-effects",
    },
    {
      name: "Mouse pointer and touch",
      desc: win11Description("Accessibility", "Mouse pointer and touch"),
      icon: win11Icon("Accessibility", "Mouse pointer and touch"),
      subPage: "a11y-pointer",
    },
    {
      name: "Magnifier",
      desc: win11Description("Accessibility", "Magnifier"),
      icon: win11Icon("Accessibility", "Magnifier"),
      subPage: "a11y-magnifier",
    },
    {
      name: "Contrast themes",
      desc: win11Description("Accessibility", "Contrast themes"),
      icon: win11Icon("Accessibility", "Contrast themes"),
      subPage: "a11y-contrast",
    },
    {
      name: "Audio",
      desc: win11Description("Accessibility", "Audio"),
      icon: win11Icon("Accessibility", "Audio"),
      subPage: "a11y-audio",
    },
    {
      name: "Keyboard",
      desc: win11Description("Accessibility", "Keyboard"),
      icon: win11Icon("Accessibility", "Keyboard"),
      subPage: "a11y-keyboard",
    },
  ],
  subPages: {
    "a11y-textsize": {
      title: "Text size",
      body: () =>
        [
          slider(
            "fontSize",
            "Text Size",
            "Text size that appears throughout the desktop",
            { min: 75, max: 150, step: 5, format: "percent" },
          ),
          slider("guiScale", "GUI Scale", "Scale the entire interface", {
            min: 50,
            max: 150,
            step: 5,
            format: "percent",
          }),
        ].join(""),
    },
    "a11y-effects": {
      title: "Visual effects",
      body: () =>
        [
          subHeading("Window Animations"),
          select(
            "windowAnimationSpeed",
            "Animation Speed",
            "Control how fast window animations play",
            WIN11_ANIMATION_SPEED_OPTIONS,
          ),
          select(
            "windowOpenAnimation",
            "Open Animation",
            "Effect when a window opens or is restored",
            WIN11_OPEN_ANIMATION_OPTIONS,
          ),
          select(
            "windowCloseAnimation",
            "Close Animation",
            "Effect when a window is closed",
            WIN11_CLOSE_ANIMATION_OPTIONS,
          ),
          select(
            "windowMinimizeAnimation",
            "Minimize Animation",
            "Effect when a window is minimized",
            WIN11_MINIMIZE_ANIMATION_OPTIONS,
          ),
          select(
            "windowRestoreAnimation",
            "Restore Animation",
            "Effect when a window returns from the taskbar",
            WIN11_RESTORE_ANIMATION_OPTIONS,
          ),
          toggle(
            "notificationsPopAnimation",
            "Pop Animation",
            "Show sliding pop animation when notifications appear",
          ),
          toggle(
            "notificationsOverFullscreen",
            "Display Over Fullscreen",
            "Show notifications over active fullscreen windows",
          ),
          toggle(
            "wobblyWindows",
            "Wobbly Windows",
            "Enable wobble effect when dragging windows",
          ),
          subHeading("Wobbly window physics"),
          slider(
            "wobbleSpringK",
            "Spring Stiffness",
            "Controls how stiff the spring is (higher = stiffer).",
            { min: 50, max: 300, step: 1 },
          ),
          slider(
            "wobbleDamping",
            "Damping",
            "Controls how quickly the wobble settles (higher = less wobble).",
            { min: 1, max: 50, step: 1 },
          ),
          slider(
            "wobbleMass",
            "Mass",
            "Controls the weight of the window (higher = heavier).",
            { min: 0.1, max: 5, step: 0.1 },
          ),
          slider(
            "wobbleDragLag",
            "Drag Lag",
            "Controls how much the window lags behind cursor when dragging.",
            { min: 0.1, max: 1, step: 0.05 },
          ),
          slider(
            "wobbleCoupleK",
            "Coupling Stiffness",
            "Controls how adjacent points affect each other (higher = more connected).",
            { min: 10, max: 200, step: 1 },
          ),
          toggle(
            "clickBubble",
            "Click Bubble Feedback",
            "Show ripple effect under cursor on click",
          ),
        ].join(""),
    },
    "a11y-pointer": {
      title: "Mouse pointer and touch",
      body: () =>
        [
          slider(
            "cursorSize",
            "Cursor Size",
            "Scale the uploaded cursor image",
            { min: 16, max: 128, step: 1, format: "px" },
          ),
          toggle(
            "mikuCursor",
            "Miku Cursor",
            "Use the Hatsune Miku cursor instead of the default",
          ),
          toggle(
            "cursorEffect",
            "Cursor Launch Effect",
            "Show a bouncing icon on cursor when launching apps",
          ),
        ].join(""),
    },
    "a11y-magnifier": {
      title: "Magnifier",
      body: () =>
        action(
          "magnifier",
          "Magnifier",
          "Open the magnifier tool",
          "Open Magnifier",
          "primary",
        ),
    },
    "a11y-contrast": {
      title: "Contrast themes",
      body: () =>
        [
          segment(
            "uiDensity",
            "UI Density",
            "Adjust spacing throughout the interface",
            WIN11_UI_DENSITY_OPTIONS,
          ),
          select(
            "fontFamily",
            "Font Family",
            "Choose the system font",
            WIN11_FONT_FAMILY_OPTIONS,
          ),
        ].join(""),
    },
    "a11y-audio": {
      title: "Audio",
      body: () =>
        [
          subHeading("Volume Control"),
          toggle("soundEnabled", "Sound", "Enable or mute all OS audio"),
          slider("masterVolume", "Master Volume", "Global volume level", {
            min: 0,
            max: 100,
            step: 1,
            format: "percent",
          }),
          subHeading("System Sounds"),
          toggle(
            "systemAudioEnabled",
            "System Audio",
            "Enable login, logout, error and warning sounds",
          ),
          slider("systemVolume", "System Volume", "Volume for system sounds", {
            min: 0,
            max: 100,
            step: 1,
            format: "percent",
          }),
        ].join(""),
    },
    "a11y-keyboard": {
      title: "Keyboard",
      body: () =>
        [
          custom(
            "shortcutsPanel",
            "Keyboard Shortcuts",
            "Rebind keys and create custom shortcut actions",
          ),
          note("Keyboard shortcuts live under Time and language, Typing."),
        ].join(""),
    },
  },
};
