# comfy

The cozy design system: colors, type and the cube logo, as code.

**Source of truth is Figma:**
- File: [cozy design system](https://www.figma.com/design/8pN42b4cUOYKJnqcZ8D41o/cozy-design-system) (page "Design Guide")
- Team folder: [cozy on Figma](https://www.figma.com/files/team/1392311666896102790/folder/46243737)

This is the old college-era style, used as the starting point for the cozy NYC map ([cozy-nyc/cozy-nyc](https://github.com/cozy-nyc/cozy-nyc)). Change it in Figma first, then update the files here.

## What's here

| Path | What |
|---|---|
| `tokens/tokens.json` | Colors, color roles per mode, fonts, type scale ([W3C design tokens](https://tr.designtokens.org/format/) format) |
| `css/cozy.css` | The same tokens as CSS custom properties, plus type classes |
| `assets/logo/cube-*.svg` | The cube logo in white, pink, hot, blue and deep (60×60) |

## The system in short

**Palette**

| Name | Hex | Dark-mode role | Light-mode role |
|---|---|---|---|
| cozy black | `#494949` | background | text |
| cozy white | `#FFFDFA` | text | background |
| cozy grey | `#C4C4C4` | muted text | — |
| cozy smoke | `#696D73` | — | muted text |
| cozy pink | `#F792BE` | accent | — |
| cozy peach | `#FFB9A6` | foreground | — |
| cozy hot | `#D92D6B` | action | — |
| cozy blue | `#58A2C1` | — | accent |
| cozy deep | `#2B6484` | — | foreground |
| cozy ice | `#76E3DD` | — | alert |

**Type:** Montserrat Alternates (headings, ExtraBold or Light for "alt"), Dosis (display and lowercase subheadings), Open Sans (body). All three are free on Google Fonts.

**Rules from the guide**
- *Foregrounds as backgrounds:* when a foreground color is used as a background, the standard background becomes the accent, and the other mode's foreground becomes the accent. Example: peach background, cozy deep as accent, cozy white as foreground.
- *Accent colors as backgrounds:* only use headings and large bold text, with white as the main text color and action colors for titles.
- Layout: 12 columns on desktop, minimum width 800px.

## Known gaps in the Figma file
- Some RGB labels don't match their hex values (pink, deep, black). The hex values are the ones used in the styles, so they're what's used here.
- In both modes, the "Background" row is labeled with the other mode's color. The frame backgrounds show the real intent (dark = cozy black, light = cozy white).
- Dark mode has no alert color and light mode has no action color. Tokens borrow them from the other mode for now.
- Effects, shadows, inputs, buttons, navigation and component pages are still empty.
