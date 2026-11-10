# Chart palette — validation finding

Paper Calm's categorical colours were run through a colour-vision-deficiency validator (OKLab ΔE ×100, against the card surface `#F9F7F5`).

| Check | Result for green / blue / purple / amber |
|---|---|
| Blue `#3C82F4` vs purple `#8C5DF5`, deuteranopia | **ΔE 1.2 — indistinguishable** (target ≥ 8) |
| Blue vs purple, normal vision | ΔE 12.0 (floor 15) |
| Green `#24C462`, amber `#F29E08` contrast on surface | ~2:1 (marks need 3:1) |

They work as **tints and chips with a text label** (how the system uses them), but not as series colours in charts.

## Validated series palette (used by QueuePro charts)

| Slot | Hex | Origin |
|---|---|---|
| series-1 | `#D9531F` | deeper brand orange |
| series-2 | `#5B3BB8` | Paper Calm purple ink |
| series-3 | `#3C82F4` | Paper Calm blue |

All checks pass across all pairs: lightness band, chroma, CVD (worst ΔE 14.5), normal-vision (worst 18.3), contrast ≥ 3:1.
Single-series charts and labelled bar lists use one colour; identity comes from the text.
