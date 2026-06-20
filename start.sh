#!/bin/bash
# Start backend in background, then frontend in foreground
npm --prefix backend run dev &
npm --prefix frontend run dev
