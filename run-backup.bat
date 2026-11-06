@echo off
cd /d "C:\Projects AI\AI\Phtotevents4"
set "NODE_PATH=photoevents-backend\node_modules"
node backup-supabase.js >> backups\backup-log.txt 2>&1
