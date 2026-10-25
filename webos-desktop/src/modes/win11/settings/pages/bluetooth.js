import {
  action,
  custom,
  note,
  slider,
  subHeading,
  toggle,
} from "../win11Controls.js";
import { win11Icon, win11Description } from "../win11SettingsIcons.js";

export const bluetoothPage = {
  id: "Bluetooth & devices",
  label: "Bluetooth & devices",
  hero: () => "",
  tiles: () => [
    {
      name: "Mouse",
      desc: win11Description(
        "Bluetooth & devices",
        "Mouse",
        "Cursor size, custom image and launch effects",
      ),
      icon: win11Icon("Bluetooth & devices", "Mouse"),
      subPage: "bt-mouse",
    },
    {
      name: "Devices",
      desc: win11Description(
        "Bluetooth & devices",
        "Devices",
        "Pointer and camera device preferences",
      ),
      icon: win11Icon("Bluetooth & devices", "Devices"),
      subPage: "bt-devices",
    },
  ],
  subPages: {
    "bt-mouse": {
      title: "Mouse",
      body: () =>
        [
          subHeading("Pointer"),
          slider(
            "cursorSize",
            "Cursor Size",
            "Scale the uploaded cursor image",
            {
              min: 16,
              max: 128,
              step: 1,
              format: "px",
            },
          ),
          toggle(
            "mikuCursor",
            "Miku Cursor",
            "Use the Hatsune Miku cursor instead of the default",
          ),
          action(
            "cursorUpload",
            "Custom Cursor",
            "Upload a PNG/JPG/GIF/WEBP cursor image for the OS",
            "Upload",
          ),
          action(
            "cursorClear",
            "Reset Cursor",
            "Remove the custom cursor image",
            "Clear",
          ),
          custom(
            "cursorStatus",
            "Cursor status",
            "Shows whether a custom cursor is active",
          ),
          toggle(
            "cursorEffect",
            "Cursor Launch Effect",
            "Show a bouncing icon on cursor when launching apps",
          ),
        ].join(""),
    },
    "bt-devices": {
      title: "Devices",
      body: () =>
        [
          note(
            "YukiOS runs entirely in the browser, so hardware device management is limited.",
          ),
          toggle(
            "cursorEffect",
            "Cursor Launch Effect",
            "Show a bouncing icon on cursor when launching apps",
          ),
          action(
            "camera",
            "Cameras",
            "Open the camera app to manage connected cameras",
            "Open Cameras",
            "primary",
          ),
        ].join(""),
    },
  },
};
