package main

import (
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

//go:embed web
var assets embed.FS

const (
	defaultPort  = 47231
	byeGrace     = 3 * time.Second
	pingTimeout  = 5 * time.Minute
	maxStateSize = 64 << 20
)

type server struct {
	statePath string
	mu        sync.Mutex
	lastPing  time.Time
	seen      bool
	bye       *time.Timer
}

func statePath() string {
	dir, err := os.UserConfigDir()
	if err != nil || dir == "" {
		dir = "."
	}
	dir = filepath.Join(dir, "planer")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "planer-state.json"
	}
	return filepath.Join(dir, "state.json")
}

func (s *server) guard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host, _, err := net.SplitHostPort(r.Host)
		if err != nil {
			host = r.Host
		}
		if host != "127.0.0.1" && host != "localhost" && host != "[::1]" && host != "::1" {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			if o := r.Header.Get("Origin"); o != "" && o != "http://"+r.Host {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func (s *server) handleState(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.mu.Lock()
		data, err := os.ReadFile(s.statePath)
		s.mu.Unlock()
		if err != nil || !json.Valid(data) {
			data = []byte("{}")
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write(data)
	case http.MethodPut:
		if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
			http.Error(w, "bad content type", http.StatusUnsupportedMediaType)
			return
		}
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxStateSize))
		if err != nil || !json.Valid(body) {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		tmp := s.statePath + ".tmp"
		if err := os.WriteFile(tmp, body, 0o644); err != nil {
			http.Error(w, "write failed", http.StatusInternalServerError)
			return
		}
		if err := os.Rename(tmp, s.statePath); err != nil {
			http.Error(w, "write failed", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *server) handlePing(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	s.lastPing = time.Now()
	s.seen = true
	if s.bye != nil {
		s.bye.Stop()
		s.bye = nil
	}
	s.mu.Unlock()
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) handleBye(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	if s.bye != nil {
		s.bye.Stop()
	}
	s.bye = time.AfterFunc(byeGrace, shutdown)
	s.mu.Unlock()
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) watch() {
	for range time.Tick(10 * time.Second) {
		s.mu.Lock()
		idle := s.seen && time.Since(s.lastPing) > pingTimeout
		s.mu.Unlock()
		if idle {
			shutdown()
		}
	}
}

func shutdown() {
	fmt.Println("Planer stopped")
	os.Exit(0)
}

func openBrowser(url string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	return cmd.Start()
}

func listen(port int) (net.Listener, error) {
	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err == nil {
		return ln, nil
	}
	return net.Listen("tcp", "127.0.0.1:0")
}

func main() {
	port := flag.Int("port", defaultPort, "preferred port")
	noBrowser := flag.Bool("no-browser", false, "do not open the browser")
	flag.Parse()

	sub, err := fs.Sub(assets, "web")
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	s := &server{statePath: statePath()}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/state", s.handleState)
	mux.HandleFunc("/api/ping", s.handlePing)
	mux.HandleFunc("/api/bye", s.handleBye)
	files := http.FileServer(http.FS(sub))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		files.ServeHTTP(w, r)
	})

	ln, err := listen(*port)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	url := "http://" + ln.Addr().String()

	fmt.Println("Planer is running at " + url)
	fmt.Println("Close the browser tab or press Ctrl+C to quit")

	if !*noBrowser {
		if err := openBrowser(url); err != nil {
			fmt.Println("Could not open the browser, open the address above manually")
		}
	}

	go s.watch()
	go func() {
		c := make(chan os.Signal, 1)
		signal.Notify(c, os.Interrupt)
		<-c
		shutdown()
	}()

	if err := http.Serve(ln, s.guard(mux)); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
