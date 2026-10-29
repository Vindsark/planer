package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
)

func main() {
	if len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "usage: bundle <web-dir> <output.html>")
		os.Exit(2)
	}
	root, out := os.Args[1], os.Args[2]
	page, err := os.ReadFile(filepath.Join(root, "index.html"))
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	read := func(name string) string {
		b, err := os.ReadFile(filepath.Join(root, name))
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return string(b)
	}
	css := regexp.MustCompile(`<link rel="stylesheet" href="([^"]+)">`)
	js := regexp.MustCompile(`<script src="([^"]+)"></script>`)
	html := css.ReplaceAllStringFunc(string(page), func(m string) string {
		return "<style>\n" + read(css.FindStringSubmatch(m)[1]) + "</style>"
	})
	html = js.ReplaceAllStringFunc(html, func(m string) string {
		return "<script>\n" + read(js.FindStringSubmatch(m)[1]) + "</script>"
	})
	if err := os.MkdirAll(filepath.Dir(out), 0o755); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	if err := os.WriteFile(out, []byte(html), 0o644); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
