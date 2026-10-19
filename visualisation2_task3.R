library(dplyr)
library(jsonlite)

clean_data <- readRDS("clean_data.rds")
nodes <- clean_data$nodes
links <- clean_data$links

creation_types <- c("PerformerOf", "ComposerOf", "LyricistOf", "ProducerOf")
influence_link_types <- c("InterpolatesFrom", "DirectlySamples", "InStyleOf", "CoverOf", "LyricalReferenceTo")

target_artists <- c("Sailor Shift", "Kimberly Snyder", "Jay Walters")

get_influence_network <- function(artist_name) {
  
  artist_id <- nodes %>% 
    filter(name == artist_name & `Node Type` %in% c("Person", "MusicalGroup")) %>% 
    pull(id) %>% first()
  
  music_links <- links %>% filter(source == artist_id & `Edge Type` %in% creation_types)
  project_ids <- music_links$target
  
  targets <- c(artist_id, project_ids)
  influence_on_others_links <- links %>% filter(target %in% targets & `Edge Type` %in% influence_link_types)
  inspired_project_ids <- influence_on_others_links$source
  
  inspired_creator_links <- links %>% filter(target %in% inspired_project_ids & `Edge Type` %in% creation_types)

  inspired_artist_nodes <- nodes %>% 
    filter(id %in% inspired_project_ids & `Node Type` %in% c("Person", "MusicalGroup")) %>% 
    pull(id)
  
  inspired_discography_links <- links %>% 
    filter(source %in% inspired_artist_nodes & `Edge Type` %in% creation_types)
  
  inspired_discography_songs <- inspired_discography_links$target

  q_links <- bind_rows(
    music_links, 
    influence_on_others_links, 
    inspired_creator_links, 
    inspired_discography_links 
  ) %>% distinct()
  
  q_nodes <- nodes %>% filter(id %in% c(
    artist_id, 
    project_ids, 
    inspired_project_ids, 
    inspired_creator_links$source,
    inspired_discography_songs 
  )) %>% distinct()
  
  return(list(nodes = q_nodes, links = q_links, centerId = artist_id))
}

all_networks <- lapply(target_artists, get_influence_network)
names(all_networks) <- target_artists

write_json(all_networks, "influence_map_data.json", pretty = TRUE, auto_unbox = TRUE)
print("Success! Upload 'influence_map_data.json' to Observable.")