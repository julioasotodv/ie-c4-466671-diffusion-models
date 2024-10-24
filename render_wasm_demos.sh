#!/bin/sh
panel convert --to pyodide-worker --out forward_diffusion_demo --title "Forward diffusion demo" --compiled Forward_diffusion_demo.ipynb
panel convert --to pyodide-worker --out the_nice_property_demo --title "The Nice property demo" --compiled The_Nice_property_demo.ipynb