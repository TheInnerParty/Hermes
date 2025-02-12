#!/bin/bash
#
# combine_files.sh
#
# Usage:
#   ./combine_files.sh <output_file> [--exclude ext]... <include_ext> [include_ext...]
#
# This script recursively finds all files with the given include extensions,
# skipping files (and entire directories) that are either manually excluded or
# ignored by Git (by way of .gitignore). For each file found, it appends a header
# (the file’s path) and then the file’s contents to the output file.
#
# License: CCO 1.0 https://creativecommons.org/publicdomain/zero/1.0/
# aka do what u want, but no warranties

# Require at least an output file and one extension.
if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <output_file> [--exclude ext]... <include_ext> [include_ext...]"
  exit 1
fi

# The first argument is the output file.
OUTPUT_FILE="$1"
shift

# Arrays for manual excludes and include file extensions.
declare -a manual_exclude
declare -a include_ext

# Parse remaining arguments.
while [ "$#" -gt 0 ]; do
  case "$1" in
    --exclude)
      shift
      if [ -z "$1" ]; then
        echo "Error: --exclude flag requires an argument." >&2
        exit 1
      fi
      manual_exclude+=("$1")
      shift
      ;;
    *)
      include_ext+=("$1")
      shift
      ;;
  esac
done

if [ "${#include_ext[@]}" -eq 0 ]; then
  echo "Error: No file extensions specified to include." >&2
  exit 1
fi

# Check if we're inside a Git repository.
use_git_ignore=false
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  use_git_ignore=true
else
  echo "Warning: Not in a Git repository. .gitignore files will not be honored." >&2
fi

# Clear (or create) the output file.
> "$OUTPUT_FILE"

# Build the include expression for find.
# This will create an expression like: \( -iname "*.js" -o -iname "*.ts" \)
inc_expr=( \( )
for ext in "${include_ext[@]}"; do
  inc_expr+=( -iname "*.${ext}" -o )
done
unset 'inc_expr[${#inc_expr[@]}-1]'  # Remove trailing -o
inc_expr+=( \) )

# Build the manual exclude expression, if any.
if [ "${#manual_exclude[@]}" -gt 0 ]; then
  excl_expr=( ! \( )
  for ext in "${manual_exclude[@]}"; do
    # If the argument starts with a dot (e.g. ".json"), use it as is; otherwise, add a dot.
    if [[ $ext == .* ]]; then
      pattern="*$ext"
    else
      pattern="*.$ext"
    fi
    excl_expr+=( -iname "$pattern" -o )
  done
  unset 'excl_expr[${#excl_expr[@]}-1]'
  excl_expr+=( \) )
fi

# Build the find command as an array.
# If using Git ignore, add an expression to prune (skip) directories that Git ignores.
find_args=()
find_args+=( . )

if $use_git_ignore; then
  # For directories: if the directory is ignored (when the leading "./" is removed),
  # then do not descend into it.
  find_args+=( \( -type d -exec sh -c 'rel="${1#./}"; git check-ignore -q -- "$rel"' _ {} \; -prune \) -o )
fi

# Now, add the file branch.
# We want files that match the include expression and (if provided) do not match the manual excludes.
find_args+=( \( -type f )
find_args+=( "${inc_expr[@]}" )
if [ "${#manual_exclude[@]}" -gt 0 ]; then
  find_args+=( "${excl_expr[@]}" )
fi
find_args+=( -print0 \) )

# Debug: Uncomment the next line to see the find command built.
# printf 'Find command: find %q\n' "${find_args[@]}"

# Execute the find command.
find "${find_args[@]}" | while IFS= read -r -d '' file; do
  # If not using the directory prune trick, still check files against Git ignore.
  if ! $use_git_ignore; then
    rel_path="${file#./}"
    if git check-ignore -q -- "$rel_path"; then
      continue
    fi
  fi

  {
    echo -e "\n==== $file ====\n"
    cat "$file"
  } >> "$OUTPUT_FILE"
done

echo "Combined file saved as $OUTPUT_FILE"