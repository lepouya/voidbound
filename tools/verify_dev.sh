#!/bin/bash
# Dev-app lifecycle helper for runtime verification (see .claude/skills/verify).
#
# Wraps the repeated launch / wait-for-build / log-tail / reload / shutdown
# command chains behind one pre-approved entry point so verification sessions
# don't re-discover (and re-approve) each chain. Screenshots stay in
# tools/verify_capture.sh — this script only manages the dev-app process and
# its log.
#
# usage: tools/verify_dev.sh <subcommand>
#   status               stale-instance check: dev task, app process, window id
#   start [-t SECS]      launch `deno task tauri dev` in background, then wait
#                        for the app (refuses if an instance already exists)
#   wait [-t SECS]       wait for the app process + window to (re)appear
#                        (e.g. after a src-tauri/ edit relaunches the backend)
#   log [-n LINES] [-g PATTERN] [-s HH:MM:SS]
#                        print the dev-task log tail; every line is prefixed
#                        with a wall-clock timestamp at the moment it was
#                        emitted, so -s filters "since" a capture/reload time
#   reload [-f FILE]     touch a frontend file (default src/main.ts) to force
#                        a Vite full page reload; prints the reload timestamp
#                        and the log lines it produced
#   stop                 kill the app + dev task tree and confirm nothing left
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
state_dir="${TMPDIR:-/tmp}"
log_file="$state_dir/voidbound-dev.log"
pid_file="$state_dir/voidbound-dev.pid"
app_pattern="target/debug/voidbound"

app_ps() { ps -eo pid,lstart,command | grep "$app_pattern" | grep -v grep || true; }

dev_task_pid() {
    # The recorded pid is the log-stamping subshell; alive means dev task alive.
    if [ -f "$pid_file" ]; then
        local pid
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then echo "$pid"; fi
    fi
}

window_id() { "$root/tools/verify_capture.sh" --id 2>/dev/null || true; }

kill_tree() {
    local pid=$1 child
    for child in $(pgrep -P "$pid" 2>/dev/null || true); do kill_tree "$child"; done
    kill "$pid" 2>/dev/null || true
}

wait_for_app() {
    local timeout=$1 waited=0 pid
    echo "waiting for app process (timeout ${timeout}s)..."
    until pgrep -f "$app_pattern" >/dev/null 2>&1; do
        if [ "$waited" -gt 0 ] && [ -z "$(dev_task_pid)" ]; then
            echo "dev task died before the app launched — log tail:" >&2
            tail -n 30 "$log_file" >&2
            return 1
        fi
        if [ "$waited" -ge "$timeout" ]; then
            echo "timed out after ${timeout}s waiting for app process — log tail:" >&2
            tail -n 15 "$log_file" >&2
            return 1
        fi
        sleep 2
        waited=$((waited + 2))
    done
    app_ps
    echo "waiting for window..."
    waited=0
    local win=""
    while [ -z "$win" ]; do
        win=$(window_id)
        if [ -n "$win" ]; then break; fi
        if [ "$waited" -ge 60 ]; then
            echo "app process is up but no window appeared within 60s" >&2
            return 1
        fi
        sleep 2
        waited=$((waited + 2))
    done
    echo "window=$win  log=$log_file"
}

cmd="${1:-}"
[ $# -gt 0 ] && shift
case "$cmd" in
status)
    pid=$(dev_task_pid)
    if [ -n "$pid" ]; then echo "dev task: running (pid $pid)"; else echo "dev task: not running"; fi
    instances=$(app_ps)
    if [ -n "$instances" ]; then
        echo "app instances:"
        echo "$instances"
        echo "window: $(window_id)"
    else
        echo "app instances: none"
    fi
    if [ -f "$log_file" ]; then
        echo "log: $log_file ($(wc -l <"$log_file" | tr -d ' ') lines, last write $(stat -f %Sm "$log_file"))"
    fi
    ;;

start)
    timeout=300
    while [ $# -gt 0 ]; do case "$1" in
        -t) timeout="$2"; shift 2 ;;
        *) echo "unknown flag: $1" >&2; exit 2 ;;
    esac done
    if [ -n "$(dev_task_pid)" ] || [ -n "$(app_ps)" ]; then
        echo "an instance is already running — 'tools/verify_dev.sh stop' first:" >&2
        app_ps >&2
        exit 1
    fi
    [ -f "$log_file" ] && mv "$log_file" "$log_file.prev"
    cd "$root"
    # Timestamp every log line as it arrives so screenshots (which also print
    # wall-clock times) can be correlated with client console output.
    nohup bash -c '
        deno task tauri dev 2>&1 | while IFS= read -r line; do
            printf "%s %s\n" "$(date +%H:%M:%S)" "$line"
        done' >"$log_file" 2>&1 &
    echo $! >"$pid_file"
    echo "dev task launched (pid $(cat "$pid_file")), log: $log_file"
    wait_for_app "$timeout"
    ;;

wait)
    timeout=300
    while [ $# -gt 0 ]; do case "$1" in
        -t) timeout="$2"; shift 2 ;;
        *) echo "unknown flag: $1" >&2; exit 2 ;;
    esac done
    wait_for_app "$timeout"
    ;;

log)
    lines=40 pattern="" since=""
    while [ $# -gt 0 ]; do case "$1" in
        -n) lines="$2"; shift 2 ;;
        -g) pattern="$2"; shift 2 ;;
        -s) since="$2"; shift 2 ;;
        *) echo "unknown flag: $1" >&2; exit 2 ;;
    esac done
    [ -f "$log_file" ] || { echo "no log at $log_file — not started?" >&2; exit 1; }
    filter() {
        if [ -n "$since" ]; then awk -v t="$since" '$1 >= t'; else cat; fi
    }
    filter <"$log_file" | { if [ -n "$pattern" ]; then grep -E "$pattern" || true; else cat; fi; } | tail -n "$lines"
    ;;

reload)
    target="$root/src/main.ts"
    while [ $# -gt 0 ]; do case "$1" in
        -f) target="$2"; shift 2 ;;
        *) echo "unknown flag: $1" >&2; exit 2 ;;
    esac done
    [ -n "$(app_ps)" ] || { echo "app is not running" >&2; exit 1; }
    ts=$(date +%H:%M:%S)
    touch "$target"
    echo "touched ${target#"$root"/} at $ts (Vite full reload)"
    sleep 3
    echo "--- log since $ts ---"
    awk -v t="$ts" '$1 >= t' "$log_file" | tail -n 30
    ;;

stop)
    pid=$(dev_task_pid)
    if [ -n "$pid" ]; then kill_tree "$pid"; fi
    pkill -f "$app_pattern" 2>/dev/null || true
    waited=0
    while [ -n "$(app_ps)" ] || [ -n "$(dev_task_pid)" ]; do
        if [ "$waited" -ge 10 ]; then
            echo "still running after 10s:" >&2
            app_ps >&2
            exit 1
        fi
        sleep 1
        waited=$((waited + 1))
    done
    rm -f "$pid_file"
    echo "stopped; no voidbound processes remain"
    ;;

*)
    sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
