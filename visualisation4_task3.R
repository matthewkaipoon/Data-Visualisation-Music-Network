library(dplyr)


clean_data <- readRDS("clean_data.rds")
nodes <- clean_data$nodes
links <- clean_data$links

creation_types <- c("PerformerOf", "ComposerOf", "LyricistOf", "ProducerOf")
# Re-adding the target artists so R knows who to look for!



oceanus_songs <- nodes %>% filter(genre == "Oceanus Folk")

oceanus_artist_links <- links %>%
  filter(target %in% oceanus_songs$id & `Edge Type` %in% creation_types)

target_artist_ids <- nodes %>% filter(name %in% target_artists) %>% pull(id)


all_relevant_artist_ids <- unique(c(oceanus_artist_links$source, target_artist_ids))

target_nodes <- nodes %>% 
  filter(id %in% all_relevant_artist_ids & `Node Type` %in% c("Person", "MusicalGroup"))

artist_songs <- links %>%
  filter(source %in% target_nodes$id & `Edge Type` %in% creation_types) %>%
  select(artist_id = source, song_id = target) %>%
  distinct() %>%
  left_join(nodes %>% select(id, release_date, notable, genre), by = c("song_id" = "id")) %>%
  mutate(release_date = as.numeric(release_date)) %>%
  filter(!is.na(release_date)) %>%
  filter(genre == "Oceanus Folk")

current_year <- max(artist_songs$release_date, na.rm = TRUE)

artist_summary <- artist_songs %>%
  group_by(artist_id) %>%
  summarise(
    Debut_Year = min(release_date, na.rm = TRUE),
    Total_Notable_Hits = sum(notable == TRUE, na.rm = TRUE),
    Total_Songs_Released = n(), 
    .groups = "drop"
  ) %>%
  mutate(
    Years_Active = current_year - Debut_Year,
    Years_Active = ifelse(Years_Active < 1, 1, Years_Active)
  )

star_finder_data <- target_nodes %>%
  select(artist_id = id, Artist_Name = name) %>%
  inner_join(artist_summary, by = "artist_id") %>%
  select(
    Artist_Name,
    Debut_Year,
    Years_Active,
    Total_Notable_Hits,
    Total_Songs_Released
  ) %>%
  filter(Years_Active <= 6 | Artist_Name %in% target_artists)

write.csv(star_finder_data, "star_finder_data.csv", row.names = FALSE)
print("Success! Upload 'star_finder_data.csv' to Observable.")