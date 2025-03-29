var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const API_ERROR_MESSAGES = {
  401: "서비스에 접속할 수 없습니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.",
  404: "요청한 리소스를 찾을 수 없습니다.",
  429: "요청 횟수가 제한을 초과했습니다. 잠시 후 다시 시도해주세요.",
  503: "서비스가 일시적으로 오프라인 상태입니다. 나중에 다시 시도해주세요.",
  500: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  502: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  504: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
};
const DEFAULT_ERROR_MESSAGE = "알수없는 오류가 발생했습니다.";
class TmdbApiError extends Error {
  constructor(message, statusCode, apiErrorCode) {
    super(message);
    __publicField(this, "statusCode");
    __publicField(this, "apiErrorCode");
    __publicField(this, "name");
    this.statusCode = statusCode;
    this.apiErrorCode = apiErrorCode;
    this.name = "TmdbApiError";
  }
}
class TmdbApi {
  constructor(apiToken, baseUrl) {
    __publicField(this, "apiToken");
    __publicField(this, "baseUrl");
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
  }
  async fetchData(endpoint, params) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append("language", "ko-KR");
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    const option = {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${this.apiToken}`
      }
    };
    try {
      const response = await fetch(url.toString(), option);
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          console.error(
            `인증 오류: ${errorData.status_code} - ${errorData.status_message}`
          );
        }
        const errorMessage = API_ERROR_MESSAGES[response.status] || errorData.status_message || DEFAULT_ERROR_MESSAGE;
        throw new TmdbApiError(
          errorMessage,
          response.status,
          errorData.status_code
        );
      }
      return response.json();
    } catch (error) {
      if (error instanceof TmdbApiError) {
        throw error;
      }
      throw error;
    }
  }
  async popularMovies(page = 1) {
    const endpoint = "/movie/popular";
    const params = {
      page: page.toString()
    };
    return this.fetchData(endpoint, params);
  }
  async searchMovies(query, page = 1) {
    const endpoint = "/search/movie";
    const params = {
      query: query || "",
      page: page.toString()
    };
    return this.fetchData(endpoint, params);
  }
  async getMovieDetail(movieId, appendToResponse) {
    const endpoint = `/movie/${movieId}`;
    const params = {};
    if (appendToResponse) {
      params.append_to_response = appendToResponse;
    }
    return this.fetchData(endpoint, params);
  }
}
class Movie {
  constructor(movieData) {
    __publicField(this, "id");
    __publicField(this, "title");
    __publicField(this, "posterPath");
    __publicField(this, "voteAverage");
    this.id = movieData.id;
    this.title = movieData.title;
    this.posterPath = movieData.posterPath;
    this.voteAverage = movieData.voteAverage;
  }
  getPosterUrl() {
    if (this.posterPath === "") {
      return "./images/nullImage.png";
    }
    return `https://image.tmdb.org/t/p/w500/${this.posterPath}`;
  }
  getVoteAverage() {
    return this.voteAverage.toFixed(1);
  }
  render() {
    const movieElement = document.createElement("div");
    movieElement.classList.add("movie-item");
    movieElement.innerHTML = `
      <img src="${this.getPosterUrl()}" alt="${this.title}">
      <h3>${this.title}</h3>
      <p>평점: ${this.getVoteAverage()}</p>
    `;
    return movieElement;
  }
}
class MovieService {
  constructor(tmdbApi) {
    __publicField(this, "api");
    this.api = tmdbApi;
  }
  convertToMovies(moviesData) {
    return {
      movies: moviesData.results.map(
        (movie) => new Movie({
          id: movie.id,
          title: movie.title,
          posterPath: movie.poster_path || "",
          voteAverage: movie.vote_average
        })
      ),
      page: moviesData.page,
      totalPages: moviesData.total_pages
    };
  }
  async getPopularResults(page = 1) {
    try {
      const response = await this.api.popularMovies(page);
      return this.convertToMovies(response);
    } catch (error) {
      console.error("영화 목록 가져오기 실패:", error);
      let errorMessage = "영화 목록 가져오기 실패";
      if (error instanceof TmdbApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(errorMessage);
      throw error;
    }
  }
  async searchMovies(query, page = 1) {
    try {
      const response = await this.api.searchMovies(query, page);
      return this.convertToMovies(response);
    } catch (error) {
      console.error("영화 검색 실패", error);
      let errorMessage = "영화 검색 실패";
      if (error instanceof TmdbApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(errorMessage);
      throw error;
    }
  }
  async getMovieDetail(movieId) {
    try {
      return await this.api.getMovieDetail(movieId);
    } catch (error) {
      console.error("영화 상세 정보 가져오기 실패", error);
      if (error instanceof TmdbApiError) {
        error.message;
      } else if (error instanceof Error) {
        error.message;
      }
      throw error;
    }
  }
}
class Store {
  constructor() {
    __publicField(this, "state");
    this.state = { currentMode: "popularAdd" };
  }
  setMode(newMode) {
    this.state.currentMode = newMode;
  }
  getMode() {
    return this.state.currentMode;
  }
}
const store = new Store();
class SearchHandler {
  constructor(movieListHandler) {
    __publicField(this, "currentQuery", "");
    __publicField(this, "movieListHandler");
    this.movieListHandler = movieListHandler;
  }
  /**
   * 검색 요청을 처리.
   * @param query 검색어
   */
  async handleSearch(query) {
    this.currentQuery = query.trim();
    if (!this.currentQuery) {
      await this.movieListHandler.loadMovies();
      return;
    }
    await this.movieListHandler.loadMovies(this.currentQuery);
  }
  /**
   * 추가 검색 결과를 불러온다 (무한 스크롤)
   */
  async loadMoreSearchResults() {
    await this.movieListHandler.loadMoreMovies(this.currentQuery);
  }
  /**
   * 현재 검색어를 반환한다.
   */
  getCurrentQuery() {
    return this.currentQuery;
  }
}
class SearchBar {
  constructor(searchHandler) {
    this.searchHandler = searchHandler;
  }
  createSearchBar() {
    const searchBarContainer = document.createElement("div");
    searchBarContainer.classList.add("search-bar-container");
    const form = document.createElement("form");
    form.classList.add("search-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input2 = e.target.querySelector(".search-bar-input");
      await this.searchHandler.handleSearch(input2.value);
      store.setMode("searchAdd");
    });
    const input = document.createElement("input");
    input.classList.add("search-bar-input");
    input.placeholder = "검색어를 입력하세요...";
    input.name = "query";
    const searchButton = document.createElement("button");
    searchButton.classList.add("search-bar-button");
    searchButton.type = "submit";
    const buttonImage = document.createElement("img");
    buttonImage.src = "images/find.png";
    buttonImage.alt = "검색";
    buttonImage.classList.add("search-icon");
    searchButton.appendChild(buttonImage);
    form.appendChild(input);
    form.appendChild(searchButton);
    searchBarContainer.appendChild(form);
    const searchHeader = document.querySelector(".search-header");
    if (!searchHeader) {
      throw new Error(".search-header 요소를 찾을 수 없습니다.");
    }
    searchHeader.appendChild(searchBarContainer);
  }
}
class MovieCard {
  constructor(movie) {
    this.movie = movie;
  }
  render() {
    const li = document.createElement("li");
    li.innerHTML = /*html*/
    `
      <div class="item">
        <img
          class="thumbnail"
          src="${this.movie.getPosterUrl()}"
          alt="${this.movie.title}"
          data-id="${this.movie.id}"
        />
        <div class="item-desc">
          <p class="rate">
            <img src="./images/star_empty.png" class="star" />
            <span>${this.movie.getVoteAverage()}</span>
          </p>
          <strong>${this.movie.title}</strong>
        </div>
      </div>
    `;
    return li;
  }
  renderSkeleton() {
    const li = document.createElement("li");
    li.classList.add("skeleton-card");
    li.innerHTML = `
      <div class="item">
        <div class="skeleton skeleton-thumbnail"></div>
        <div class="item-desc">
          <p class="rate">
            <div class="skeleton skeleton-star"></div>
            <div class="skeleton skeleton-rate"></div>
          </p>
          <div class="skeleton skeleton-title"></div>
        </div>
      </div>
    `;
    return li;
  }
}
class NoResultsMessage {
  render() {
    const noResultsItem = document.createElement("div");
    noResultsItem.classList.add("no-results");
    noResultsItem.innerHTML = /*html*/
    `
      <img src="./images/aaaahangsung.png" alt="no results" class="no-results-image">
      <p class="no-results-text">검색 결과가 없습니다</p>
    `;
    return noResultsItem;
  }
}
class MovieRatingStorage {
  constructor() {
    this.ratings = this.getRatings();
  }
  getRatings() {
    const storedRatings = localStorage.getItem("movie_ratings");
    return storedRatings ? JSON.parse(storedRatings) : {};
  }
  saveRating(movieId, rating) {
    console.log(movieId, rating);
    this.ratings[movieId] = rating;
    localStorage.setItem("movie_ratings", JSON.stringify(this.ratings));
  }
  getRating(movieId) {
    console.log(this.ratings);
    return this.ratings[movieId] || null;
  }
  getAllRatings() {
    return this.ratings;
  }
}
class StarRating {
  constructor(movie) {
    this.movie = movie;
    this.ratingStorage = new MovieRatingStorage();
    this.userRating = this.ratingStorage.getRating(this.movie.id) || 0;
  }
  render() {
    const container = document.createElement("div");
    container.classList.add("star-rating");
    container.innerHTML = /*html*/
    `
      <div class="star-rating-item">
        <span class="empty-star" data-rating="1"><img src="./images/star_empty.png" class="star" /></span>
        <span class="empty-star" data-rating="2"><img src="./images/star_empty.png" class="star" /></span>
        <span class="empty-star" data-rating="3"><img src="./images/star_empty.png" class="star" /></span>
        <span class="empty-star" data-rating="4"><img src="./images/star_empty.png" class="star" /></span>
        <span class="empty-star" data-rating="5"><img src="./images/star_empty.png" class="star" /></span>
      </div>
      <div class="detail-rating">
        <span class="rating-text">이 작품 어땠나요?</span>
        <span class="rating-score">(?/10)</span>
      </div>
    `;
    this.setupStarRating(container);
    return container;
  }
  setupStarRating(modalElement) {
    const stars = modalElement.querySelectorAll(".empty-star");
    const ratingText = modalElement.querySelector(".rating-text");
    const ratingScore = modalElement.querySelector(".rating-score");
    const ratingTexts = {
      1: "최악이에요",
      2: "별로예요",
      3: "보통이에요",
      4: "재미있어요",
      5: "명작이에요"
    };
    const ratingScores = {
      1: "(2/10)",
      2: "(4/10)",
      3: "(6/10)",
      4: "(8/10)",
      5: "(10/10)"
    };
    if (this.userRating > 0) {
      stars.forEach((s, index) => {
        if (index < this.userRating) {
          s.innerHTML = '<img src="./images/star_filled.png" class="star" />';
          s.classList.remove("empty-star");
          s.classList.add("filled-star");
        }
      });
      ratingText.textContent = ratingTexts[this.userRating];
      ratingScore.textContent = ratingScores[this.userRating];
    }
    stars.forEach((star) => {
      star.addEventListener("click", () => {
        const rating = parseInt(star.dataset.rating);
        this.userRating = rating;
        this.ratingStorage.saveRating(this.movie.id, rating);
        stars.forEach((s, index) => {
          if (index < rating) {
            s.innerHTML = '<img src="./images/star_filled.png" class="star" />';
            s.classList.remove("empty-star");
            s.classList.add("filled-star");
          } else {
            s.innerHTML = '<img src="./images/star_empty.png" class="star" />';
            s.classList.remove("filled-star");
            s.classList.add("empty-star");
          }
        });
        ratingText.textContent = ratingTexts[rating];
        ratingScore.textContent = ratingScores[rating];
      });
    });
  }
}
class DetailModal {
  constructor(movie) {
    this.movie = movie;
  }
  render() {
    const modalBackground = document.createElement("div");
    modalBackground.classList.add("modal-background", "active");
    modalBackground.id = "modalBackground";
    modalBackground.innerHTML = /*html*/
    `
      <div class="modal">
        <button class="close-modal" id="closeModal">
          <img src="./images/modal_button_close.png" />
        </button>
        <div class="modal-container">
          <div class="modal-image">
            <img src="https://image.tmdb.org/t/p/original${this.movie.poster_path}" />
          </div>
          <div class="modal-description">
            <h2>${this.movie.title}</h2>
            <p class="category">
              ${this.movie.release_date} · ${this.movie.genres.map((genre) => genre.name).join(", ")}
            </p>
            
            <p class="rate">
              <span>평균</span><img src="./images/star_filled.png" class="star" /><span>${this.movie.vote_average}</span>
            </p>  
            
            <hr />
            <p class="my-rate">
              <span>내 별점</span>
              <div class="star-rating-container"></div>
            </p>

            <hr />
            <div class="movie-overview">
              <span>줄거리</span>
              <p class="detail">
                ${this.movie.overview}
              </p>
            </div>

          </div>
        </div>
      </div>
    `;
    const starRatingContainer = modalBackground.querySelector(
      ".star-rating-container"
    );
    const starRating = new StarRating(this.movie);
    starRatingContainer.appendChild(starRating.render());
    return modalBackground;
  }
  addDetailModal(movie) {
    const modal = new DetailModal(movie);
    const modalElement = modal.render();
    document.body.classList.add("modal-open");
    document.body.appendChild(modalElement);
    const closeModal = modalElement.querySelector("#closeModal");
    closeModal.addEventListener("click", () => {
      this.removeDetailModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.removeDetailModal();
      }
    });
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-background")) {
        this.removeDetailModal();
      }
    });
  }
  removeDetailModal() {
    const modalBackground = document.querySelector(".modal-background");
    document.body.classList.remove("modal-open");
    modalBackground.remove();
  }
}
class MovieList {
  constructor(containerSelector, moviesData, currentPage, totalPage, movieService, movieListHandler) {
    this.container = document.querySelector(containerSelector);
    this.moviesData = moviesData;
    this.movieService = movieService;
    this.currentPage = parseInt(currentPage);
    this.totalPage = totalPage;
    this.movieListHandler = movieListHandler;
    this.loading = false;
    this.lastQuery = null;
    this.scrollTimer = null;
    this.boundHandleScroll = this.handleScroll.bind(this);
  }
  init() {
    this.loadInitMovie();
    this.addMovieClickEvent();
  }
  setupInfiniteScroll() {
    this.scrollTimer = null;
    window.addEventListener("scroll", this.boundHandleScroll);
  }
  handleScroll() {
    if (this.loading || this.currentPage >= this.totalPage) {
      if (this.currentPage >= this.totalPage) {
        console.log(
          `마지막 페이지 도달: ${this.currentPage}/${this.totalPage}`
        );
        window.removeEventListener("scroll", this.boundHandleScroll);
      }
      return;
    }
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const clientHeight = document.documentElement.clientHeight;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      if (this.scrollTimer) return;
      this.scrollTimer = setTimeout(() => {
        console.log("로드 요청: 페이지", this.currentPage, "/", this.totalPage);
        if (store.getMode() === "searchAdd") {
          this.movieListHandler.loadMoreMovies(this.lastQuery);
        } else {
          this.movieListHandler.loadMoreMovies();
        }
        this.scrollTimer = null;
      }, 300);
    }
  }
  addMovieClickEvent() {
    const movieCards = document.querySelectorAll(".thumbnail");
    movieCards.forEach((movieCard) => {
      movieCard.addEventListener("click", async () => {
        const movieId = movieCard.dataset.id;
        try {
          const movieDetail = await this.movieService.getMovieDetail(movieId);
          const detailModal = new DetailModal(movieDetail);
          detailModal.addDetailModal(movieDetail);
        } catch (error) {
          console.error("영화 상세 정보를 가져오는데 실패했습니다:", error);
        }
      });
    });
  }
  loadInitMovie() {
    const noResultsItem = document.querySelector(".no-results");
    if (noResultsItem) {
      noResultsItem.remove();
    }
    if (!this.moviesData || this.moviesData.length === 0) {
      const section = document.querySelector(".movie-select");
      const noResultsItem2 = new NoResultsMessage();
      section.appendChild(noResultsItem2.render());
      return;
    }
    Array.from({ length: this.moviesData.length }).forEach(() => {
      const skeletonCard = new MovieCard(null).renderSkeleton();
      this.container.appendChild(skeletonCard);
    });
    this.container.innerHTML = "";
    this.moviesData.forEach((movieData) => {
      const movie = new Movie(movieData);
      const movieCard = new MovieCard(movie);
      this.container.appendChild(movieCard.render());
    });
    this.setupInfiniteScroll();
  }
  static removeMovieList() {
    const movieList = document.querySelector(".thumbnail-list");
    movieList.textContent = "";
  }
  updateMovieListTitle(query) {
    this.resetPageNumber();
    const movieListTitle = document.querySelector(".movie-list-title");
    if (query) {
      movieListTitle.textContent = `"${query}" 검색 결과`;
      return;
    }
    movieListTitle.textContent = "지금 인기 있는 영화";
  }
  addPageNumber() {
    this.currentPage += 1;
  }
  resetPageNumber() {
    this.currentPage = 1;
  }
}
class MovieListHandler {
  constructor(movieService) {
    __publicField(this, "movieList");
    __publicField(this, "movieService");
    __publicField(this, "store");
    this.movieService = movieService;
    this.store = store;
  }
  /**
   * 영화 목록을 불러오고 렌더링한다.
   * @param query 검색어 (옵션)
   */
  async loadMovies(query) {
    const moviesData = query ? await this.movieService.searchMovies(query, 1) : await this.movieService.getPopularResults();
    this.store.setMode(query ? "searchAdd" : "popularAdd");
    this.updateMovieListUI(moviesData, query);
  }
  /**
   * 추가 영화를 로드한다. (무한 스크롤)
   * @param query 검색어 (옵션)
   */
  async loadMoreMovies(query) {
    if (!this.movieList || this.movieList.loading) {
      console.log("로딩 중이거나 MovieList가 없어 중단");
      return;
    }
    if (this.movieList.currentPage >= this.movieList.totalPage) {
      console.log(
        `마지막 페이지 도달(${this.movieList.currentPage}/${this.movieList.totalPage}), 추가 로드 중단`
      );
      return;
    }
    this.movieList.loading = true;
    const pageNumber = this.movieList.currentPage + 1;
    this.movieList.addPageNumber();
    this.addSkeletonCards();
    let actualQuery = query;
    if (!actualQuery && this.store.getMode() === "searchAdd") {
      actualQuery = this.movieList.lastQuery;
    }
    let newMoviesData = this.store.getMode() === "popularAdd" ? await this.movieService.getPopularResults(pageNumber) : await this.movieService.searchMovies(actualQuery, pageNumber);
    this.replaceSkeletonsWithMovies(newMoviesData.movies);
    if (this.movieList.currentPage >= this.movieList.totalPage) {
      this.cleanupScrollListener();
    }
    this.movieList.loading = false;
  }
  /**
   * UI 업데이트: 영화 목록과 타이틀 갱신
   */
  updateMovieListUI(movieData, query) {
    if (this.movieList && this.movieList.boundHandleScroll) {
      window.removeEventListener("scroll", this.movieList.boundHandleScroll);
    }
    MovieList.removeMovieList();
    this.movieList = new MovieList(
      ".thumbnail-list",
      movieData.movies,
      movieData.page,
      movieData.totalPages,
      this.movieService,
      this
    );
    if (query) {
      this.movieList.lastQuery = query;
    }
    this.movieList.init();
    this.movieList.updateMovieListTitle(query);
  }
  /**
   * 스켈레톤 카드 추가 (로딩 UI)
   */
  addSkeletonCards() {
    Array.from({ length: 5 }).forEach(() => {
      var _a;
      const skeletonCard = new MovieCard(null).renderSkeleton();
      (_a = this.movieList) == null ? void 0 : _a.container.appendChild(skeletonCard);
    });
  }
  /**
   * 스켈레톤 카드를 실제 영화 카드로 교체
   */
  replaceSkeletonsWithMovies(movies) {
    var _a;
    (_a = this.movieList) == null ? void 0 : _a.container.querySelectorAll(".skeleton-card").forEach((skeleton) => skeleton.remove());
    movies.forEach((movie) => {
      var _a2;
      const movieCard = new MovieCard(movie);
      (_a2 = this.movieList) == null ? void 0 : _a2.container.appendChild(movieCard.render());
    });
  }
  /**
   * 마지막 페이지에 도달했을 때 이벤트 리스너 및 UI 정리
   */
  cleanupScrollListener() {
    var _a, _b, _c;
    console.log(
      `마지막 페이지 도달: ${(_a = this.movieList) == null ? void 0 : _a.currentPage}/${(_b = this.movieList) == null ? void 0 : _b.totalPage}`
    );
    if ((_c = this.movieList) == null ? void 0 : _c.boundHandleScroll) {
      window.removeEventListener("scroll", this.movieList.boundHandleScroll);
    }
    const loadMoreButton = document.querySelector(".add-movie");
    if (loadMoreButton) loadMoreButton.remove();
  }
}
class Logo {
  constructor(movieListHandler) {
    this.movieListHandler = movieListHandler;
  }
  createLogo() {
    const logo = document.querySelector(".logo");
    if (logo) {
      logo.addEventListener("click", this.handleLogoClick.bind(this));
    } else {
      console.error("로고 요소를 찾을 수 없습니다.");
    }
  }
  async handleLogoClick() {
    store.setMode("popularAdd");
    await this.movieListHandler.initMovieList();
  }
}
class App {
  constructor() {
    __publicField(this, "api");
    __publicField(this, "movieService");
    __publicField(this, "movieListHandler");
    __publicField(this, "searchHandler");
    this.api = new TmdbApi(
      "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjZWIyNGYwYTUwYzYxOThkNzExNjEyZTU5NDUwM2YyMyIsIm5iZiI6MTc0MjI4Mjc5MC45MTkwMDAxLCJzdWIiOiI2N2Q5MjAyNmUxZTNjZGNiZjljNmE3ZTciLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.TYjoP8fOSebrdRtncq50rh6vC8h3EldqEIFhBLgrNL8",
      "https://api.themoviedb.org/3"
    );
    this.movieService = new MovieService(this.api);
    this.movieListHandler = new MovieListHandler(this.movieService);
    this.searchHandler = new SearchHandler(this.movieListHandler);
  }
  async initialize() {
    try {
      this.initializeUIComponents();
      await this.movieListHandler.loadMovies();
    } catch (error) {
      console.error("애플리케이션 초기화 실패:", error);
    }
  }
  initializeUIComponents() {
    const searchBar = new SearchBar(this.searchHandler);
    searchBar.createSearchBar();
    const logo = new Logo(this.movieListHandler);
    logo.createLogo();
  }
}
window.addEventListener("load", async () => {
  const app = new App();
  await app.initialize();
});
